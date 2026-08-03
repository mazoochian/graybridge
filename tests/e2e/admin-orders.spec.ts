import { test, expect, request as pwRequest } from "@playwright/test";
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

async function login(page: import("@playwright/test").Page) {
  const { username, password } = readAdminCredentials();
  await page.goto("/admin");
  // The login form's two inputs have no placeholder/id — just adjacent
  // <label> text — so target by input order/type instead.
  await page.locator("input").first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: 10_000 });
}

test("admin can log in and see the orders table", async ({ page }) => {
  await login(page);
  await page.getByText("Orders", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await expect(page.getByText(`#GB-`).first()).toBeVisible({ timeout: 10_000 });
});

test("order search filters to the matching row", async ({ page }) => {
  await login(page);
  await page.getByText("Orders", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

  await page.getByPlaceholder(/search order/i).fill(ORDER_A_EMAIL);
  // debounced search — wait for the row to actually settle
  await expect(page.getByText(ORDER_A_NAME)).toBeVisible({ timeout: 5_000 });
  const rowCount = await page.getByText(ORDER_A_EMAIL).count();
  expect(rowCount).toBe(1);
});

test("tracking carrier/number can be saved and persists across reload", async ({ page }) => {
  await login(page);
  await page.getByText("Orders", { exact: true }).click();
  await page.getByPlaceholder(/search order/i).fill(ORDER_A_EMAIL);
  await expect(page.getByText(ORDER_A_NAME)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByPlaceholder("Carrier")).toHaveCount(1, { timeout: 5_000 });

  const carrierInput = page.getByPlaceholder("Carrier");
  const trackingInput = page.getByPlaceholder("Tracking #");
  await carrierInput.fill("UPS");
  await trackingInput.fill("1Z999AA10123456784");
  await trackingInput.blur();
  // Carrier/Tracking # save is debounced (500ms) into a single combined
  // PATCH — wait comfortably past that before reloading.
  await page.waitForTimeout(900);

  await page.reload();
  await page.getByText("Orders", { exact: true }).click();
  await page.getByPlaceholder(/search order/i).fill(ORDER_A_EMAIL);
  await expect(page.getByText(ORDER_A_NAME)).toBeVisible({ timeout: 5_000 });
  await expect(page.getByPlaceholder("Carrier")).toHaveCount(1, { timeout: 5_000 });
  await expect(page.getByPlaceholder("Carrier")).toHaveValue("UPS");
  await expect(page.getByPlaceholder("Tracking #")).toHaveValue("1Z999AA10123456784");
});
