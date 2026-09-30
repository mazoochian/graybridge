import { test, expect } from "./helpers";

// Two regressions covered here:
// 1. The cart keyed lines by product + size only, so adding the same
//    product/size in a second color bumped the first color's quantity
//    and the order shipped (and decremented stock for) the wrong color.
// 2. After a successful order, clearCart() emptied the cart while the
//    push to /checkout/success was still pending, and the checkout page's
//    "empty cart -> /cart" redirect overrode it, so the shopper never
//    saw their confirmation.

test("same product and size in two colors stay separate lines, and checkout lands on the success page", async ({ page }) => {
  const products = await (await page.request.get("/api/products")).json();
  let picked: { id: number; size: string; colors: [string, string] } | null = null;
  for (const p of products) {
    const bySize = new Map<string, string[]>();
    for (const v of p.variants) {
      if (v.stock > 0) bySize.set(v.size, [...(bySize.get(v.size) ?? []), v.color]);
    }
    const hit = [...bySize.entries()].find(([, colors]) => colors.length >= 2);
    if (hit) {
      picked = { id: p.id, size: hit[0], colors: [hit[1][0], hit[1][1]] };
      break;
    }
  }
  if (!picked) throw new Error("No product with two in-stock colors in one size.");

  for (const color of picked.colors) {
    await page.goto(`/product/${picked.id}`);
    await page.locator(`[title="${color}"]`).first().click();
    await page.getByText(picked.size, { exact: true }).first().click();
    await page.getByRole("button", { name: /add to bag/i }).click();
  }

  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("gb_cart") || "[]"));
  expect(cart).toHaveLength(2);
  expect(cart.map((c: { color: string }) => c.color).sort()).toEqual([...picked.colors].sort());

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 10_000 });
  await page.getByPlaceholder("Jamie Rivera").fill("E2E Two Colors");
  await page.getByPlaceholder("you@example.com").fill(`e2e-colors-${Date.now().toString(36)}@example.com`);
  await page.getByPlaceholder("123 Main St").fill("1 Test Way");
  await page.getByPlaceholder("Pittsburgh").fill("Testville");
  await page.getByPlaceholder("PA").fill("CA");
  await page.getByPlaceholder("15222").fill("90210");
  await page.getByRole("button", { name: /place order/i }).click();

  await expect(page).toHaveURL(/\/checkout\/success\?order=GB-/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Order confirmed" })).toBeVisible();
});
