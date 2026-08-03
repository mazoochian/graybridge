import { test, expect } from "@playwright/test";

// Regression coverage for the "falls back to catalog[0] instead of 404"
// bug in app/(store)/product/[id]/page.tsx, plus the new error/not-found
// boundaries added alongside the fix.

test("a nonexistent product id shows the store 404, not a random product", async ({ page }) => {
  await page.goto("/product/999999999");
  await expect(page.getByText(/couldn't find that page/i)).toBeVisible({ timeout: 10_000 });
  // Must NOT render any real product content (add-to-bag button, price, etc).
  await expect(page.getByText(/add to bag/i)).toHaveCount(0);
});

test("a non-numeric product id shows the store 404 immediately", async ({ page }) => {
  await page.goto("/product/not-a-number");
  await expect(page.getByText(/couldn't find that page/i)).toBeVisible({ timeout: 10_000 });
});

test("a real product id renders that product, not a different one", async ({ page }) => {
  const res = await page.request.get("/api/products");
  const products = await res.json();
  const target = products[5]; // pick something other than index 0 to prove it's not just falling back to catalog[0]

  await page.goto(`/product/${target.id}`);
  await expect(page.getByRole("heading", { name: target.name, exact: true })).toBeVisible({ timeout: 10_000 });
});

test("root-level 404 renders for an unmatched top-level route", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByText(/page not found/i)).toBeVisible({ timeout: 10_000 });
});
