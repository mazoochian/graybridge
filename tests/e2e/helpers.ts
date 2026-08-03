import type { Page } from "@playwright/test";

/**
 * Navigates to a real in-stock product's detail page, selects its
 * specific in-stock size/color combo (not just "any product with some
 * variant in stock" — the page defaults to size M + the first color,
 * which frequently is NOT the in-stock cell once seeded stock is spread
 * thin across ~15 size/color cells per product), and clicks "Add to
 * bag". Used by e2e specs that need a real cart item without going
 * through the grid's small icon-only quick-add button.
 */
export async function addAnInStockProductToCart(page: Page): Promise<void> {
  const products = await (await page.request.get("/api/products")).json();
  let picked: { product: any; variant: any } | null = null;
  for (const product of products) {
    const variant = product.variants.find((v: any) => v.stock > 0);
    if (variant) {
      picked = { product, variant };
      break;
    }
  }
  if (!picked) throw new Error("No in-stock product/variant found in the catalog — can't add to cart.");

  await page.goto(`/product/${picked.product.id}`);
  // .first() defensively — the "related products" grid further down the
  // page can render another swatch with the same title/color name.
  await page.locator(`[title="${picked.variant.color}"]`).first().click();
  await page.getByText(picked.variant.size, { exact: true }).first().click();
  await page.getByRole("button", { name: /add to bag/i }).click();
}
