import { test, expect } from "./helpers";
import { addAnInStockProductToCart } from "./helpers";

// Found while adding real <form> Enter-key support to the checkout page:
// hard-navigating straight to /checkout (e.g. a page refresh) starts the
// cart in its initial empty [] state for one render before the
// localStorage hydration effect runs. The checkout page's "redirect to
// /cart if the cart is empty" effect used to fire on that transient
// empty state and bounce the user away even though they really did have
// items in their cart. Fixed by gating that redirect on a new
// `cartHydrated` flag in lib/store.tsx.
test("hard refresh on checkout with items in cart does not bounce to /cart", async ({ page }) => {
  await addAnInStockProductToCart(page);
  await page.goto("/cart");
  await page.getByRole("button", { name: /checkout/i }).click();
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 10000 });
  // Now hard-reload directly on /checkout — this is the scenario that raced before.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/checkout$/);
});
