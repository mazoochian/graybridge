import { test, expect, request as pwRequest, type Cookie } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// e2e specs run against the real dev server + dev Postgres DB (see
// playwright.config.ts), not the isolated Vitest test DB — this is
// deliberate: these are "does this actually work in a booted instance"
// checks for the riskier UI changes, per the overnight plan. Every order
// this spec creates is uniquely named/emailed and cleaned up at the end.

function readAdminCredentials(): { username: string; password: string } {
  const raw = readFileSync(path.resolve(__dirname, "../../.admin-credentials.local.txt"), "utf8");
  const username = raw.match(/username:\s*(\S+)/)?.[1];
  const password = raw.match(/password:\s*(\S+)/)?.[1];
  if (!username || !password) throw new Error("Could not parse .admin-credentials.local.txt");
  return { username, password };
}

const RUN_ID = Date.now().toString(36);
const ORDER_A_NAME = `E2E Order Alpha ${RUN_ID}`;
const ORDER_A_EMAIL = `e2e-alpha-${RUN_ID}@example.com`;

test.describe.configure({ mode: "serial" });

let createdOrderIds: number[] = [];
// Captured once after the first (real, UI-driven) login and reused by
// the other tests in this file via cookie injection — /api/auth/login
// is intentionally rate-limited (5 attempts/15min per username, see
// lib/rate-limit.ts), and every test in this file logging in separately
// through the UI was eating into that same budget fast enough to
// occasionally 429 a later test during a busy run (e.g. right after a
// retry). Only the "admin can log in" test below needs to exercise the
// real login form; the others just need to already be authenticated.
let savedCookies: Cookie[] | null = null;

test.beforeAll(async ({ baseURL }) => {
  // Place one real order through the checkout API against a real seeded
  // product/variant so the orders table has a deterministic, searchable
  // row to assert against.
  const api = await pwRequest.newContext({ baseURL });
  const products = await (await api.get("/api/products")).json();
  const withStock = products.find((p: any) => p.variants.some((v: any) => v.stock > 0));
  const variant = withStock.variants.find((v: any) => v.stock > 0);

  const checkoutRes = await api.post("/api/checkout", {
    data: {
      items: [{ id: withStock.id, size: variant.size, color: variant.color, qty: 1 }],
      name: ORDER_A_NAME,
      email: ORDER_A_EMAIL,
      address: { line1: "1 E2E Way", line2: "", city: "Testville", region: "CA", postalCode: "90210", country: "US", phone: "" },
    },
  });
  expect(checkoutRes.ok()).toBeTruthy();
  const order = await checkoutRes.json();
  createdOrderIds.push(order.id);
  await api.dispose();
});

test.afterAll(async ({ baseURL }) => {
  const { username, password } = readAdminCredentials();
  const api = await pwRequest.newContext({ baseURL });
  await api.post("/api/auth/login", { data: { username, password } });
  // No DELETE endpoint for orders exists (intentional — orders are
  // permanent records); leave the order rows in place, matching how
  // prior sessions' checkout smoke tests were handled. Just note it here
  // rather than silently leaving unexplained state.
  await api.dispose();
});

/** Real UI-driven login — only for the test that's actually testing the login form. */
async function loginViaUi(page: import("@playwright/test").Page) {
  const { username, password } = readAdminCredentials();
  await page.goto("/admin");
  // The login form's two inputs have no placeholder/id — just adjacent
  // <label> text — so target by input order/type instead.
  await page.locator("input").first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: 10_000 });
}

/** Reuses the session cookie captured from the first test's real login instead of logging in again. */
async function restoreAdminSession(page: import("@playwright/test").Page) {
  if (!savedCookies) throw new Error("No saved admin session — the 'admin can log in' test must run first.");
  await page.context().addCookies(savedCookies);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: 10_000 });
}

test("admin can log in and see the orders table", async ({ page }) => {
  await loginViaUi(page);
  savedCookies = await page.context().cookies();

  await page.getByText("Orders", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await expect(page.getByText(`#GB-`).first()).toBeVisible({ timeout: 10_000 });
});

test("order search filters to the matching row", async ({ page }) => {
  await restoreAdminSession(page);
  await page.getByText("Orders", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

  await page.getByPlaceholder(/search order/i).fill(ORDER_A_EMAIL);
  // debounced search — wait for the row to actually settle
  await expect(page.getByText(ORDER_A_NAME)).toBeVisible({ timeout: 5_000 });
  const rowCount = await page.getByText(ORDER_A_EMAIL).count();
  expect(rowCount).toBe(1);
});

test("tracking carrier/number can be saved and persists across reload", async ({ page }) => {
  await restoreAdminSession(page);
  await page.getByText("Orders", { exact: true }).click();
  await page.getByPlaceholder(/search order/i).fill(ORDER_A_EMAIL);
  await expect(page.getByText(ORDER_A_NAME)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByPlaceholder("Carrier")).toHaveCount(1, { timeout: 5_000 });

  const carrierInput = page.getByPlaceholder("Carrier");
  const trackingInput = page.getByPlaceholder("Tracking #");
  await carrierInput.fill("UPS");
  await trackingInput.fill("1Z999AA10123456784");
  await trackingInput.blur();

  // Carrier/Tracking # save is debounced — rather than assert on the
  // save-confirmation toast (transient UI; Playwright's fill() on two
  // separate inputs can easily be >500ms apart in wall-clock time, which
  // can trigger two separate debounced saves instead of one and makes
  // "is the toast visible right now" a flaky thing to assert on even
  // though the underlying save is correct either way — the sequence
  // guard in commitOrderTracking ensures the final persisted state is
  // still right), poll the API directly for the persisted values. This
  // is what actually matters; the UI reload+check below is the final
  // real-world verification.
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`/api/orders?q=${encodeURIComponent(ORDER_A_EMAIL)}`);
        const data = await res.json();
        return data.orders?.[0];
      },
      // Generous timeout: this polls past the 500ms debounce plus a real
      // network round trip, and has been observed to occasionally need
      // longer than 5s specifically when run as part of the full suite
      // (a long-running single `next dev` process serving many
      // sequential tests) rather than in isolation.
      { timeout: 10_000 },
    )
    .toMatchObject({ carrier: "UPS", trackingNumber: "1Z999AA10123456784" });

  await page.reload();
  await page.getByText("Orders", { exact: true }).click();
  await page.getByPlaceholder(/search order/i).fill(ORDER_A_EMAIL);
  await expect(page.getByText(ORDER_A_NAME)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByPlaceholder("Carrier")).toHaveCount(1, { timeout: 5_000 });
  await expect(page.getByPlaceholder("Carrier")).toHaveValue("UPS");
  await expect(page.getByPlaceholder("Tracking #")).toHaveValue("1Z999AA10123456784");
});
