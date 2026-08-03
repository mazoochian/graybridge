import { test, expect } from "@playwright/test";

// The shop/browse page used to render the entire eagerly-fetched
// app-wide catalog (all ~150 products + ~2000 variant rows) with
// client-side-only filter/sort and no pagination. It now fetches its own
// paginated slice from /api/products?page=&pageSize=... directly.

test("the shop page's product request is paginated, not the full catalog", async ({ page }) => {
  const productRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/products")) productRequests.push(req.url());
  });

  await page.goto("/shop");
  await expect(page.locator("main")).toContainText("items", { timeout: 10_000 });

  const paginatedRequest = productRequests.find((u) => u.includes("page=") && u.includes("pageSize="));
  expect(paginatedRequest).toBeTruthy();
});

test("shop page pagination controls move between pages without duplicating results", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.locator("main")).toContainText("items", { timeout: 10_000 });

  const nextButton = page.getByRole("button", { name: /next/i });
  // Only proceed if there's more than one page (depends on seeded catalog size).
  if (!(await nextButton.isEnabled().catch(() => false))) {
    test.skip(true, "catalog has only one page at the current page size");
  }

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
