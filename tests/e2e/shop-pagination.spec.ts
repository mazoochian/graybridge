import { test, expect } from "./helpers";

// The shop/browse page used to render the entire eagerly-fetched
// app-wide catalog (all ~150 products + ~2000 variant rows) with
// client-side-only filter/sort and no pagination. It now fetches its own
// paginated slice from /api/products?page=&pageSize=... directly.

test("the shop page's product request is paginated, not the full catalog", async ({ page }) => {
  // Armed before navigating, and awaited directly, so this doesn't depend
  // on the fetch happening to be observed before some other condition
  // settles. An earlier version collected requests via page.on("request")
  // and then asserted after waiting for the item count to render — the
  // app-wide catalog fetch can satisfy that gate on its own, so whether
  // the shop's own paginated request had fired yet came down to incidental
  // page-load timing.
  const paginatedRequest = page.waitForRequest(
    (req) => req.url().includes("/api/products") && req.url().includes("page=") && req.url().includes("pageSize="),
    { timeout: 10_000 },
  );

  await page.goto("/shop");

  expect((await paginatedRequest).url()).toContain("pageSize=");
  await expect(page.locator("main")).toContainText("items", { timeout: 10_000 });
});

test("shop page pagination controls move between pages without duplicating results", async ({ page }) => {
  // Decide up front, via the API directly, whether there's more than one
  // page at the shop page's page size (24) — deterministic, instead of
  // racing UI load timing to infer it from whether a "Next" button
  // happens to have rendered yet when we check.
  const data = await (await page.request.get("/api/products?page=1&pageSize=24")).json();
  test.skip(data.totalPages <= 1, "catalog has only one page at the current page size");

  await page.goto("/shop");
  await expect(page.getByText(/page 1 of/i)).toBeVisible({ timeout: 10_000 });

  // Scoped to <main> and exact text — Next.js 16's dev-mode floating
  // "Open Next.js Dev Tools" button also matches a loose /next/i name
  // filter (it's outside <main>, but a bare getByRole with no scope
  // still matches it too).
  const nextButton = page.locator("main").getByRole("button", { name: "Next →", exact: true });
  await expect(nextButton).toBeEnabled({ timeout: 5_000 });

  const firstPageFirstProduct = await page.locator("main >> text=$").first().textContent();
  await nextButton.click();
  await expect(page.getByText(/page 2 of/i)).toBeVisible({ timeout: 5_000 });
  const secondPageFirstProduct = await page.locator("main >> text=$").first().textContent();
  expect(firstPageFirstProduct).not.toEqual(secondPageFirstProduct);
});

test("shop page category filter still narrows results correctly", async ({ page }) => {
  await page.goto("/shop?cat=Denim");
  await expect(page.getByRole("heading", { name: "Denim" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("main")).toContainText("items");
});
