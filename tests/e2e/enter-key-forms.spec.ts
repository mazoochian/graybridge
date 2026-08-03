import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { addAnInStockProductToCart } from "./helpers";

// Login/signup/checkout etc used to be styled divs + onClick buttons
// instead of real <form onSubmit>, so pressing Enter in a text field did
// nothing. Converted to real forms — this pins down that Enter now
// submits, for the customer login, admin login, and checkout discount
// code flows (representative samples, not every form in the app).

function readAdminCredentials(): { username: string; password: string } {
  const raw = readFileSync(path.resolve(__dirname, "../../.admin-credentials.local.txt"), "utf8");
  const username = raw.match(/username:\s*(\S+)/)?.[1];
  const password = raw.match(/password:\s*(\S+)/)?.[1];
  if (!username || !password) throw new Error("Could not parse .admin-credentials.local.txt");
  return { username, password };
}

test("pressing Enter in the customer login password field submits the form", async ({ page }) => {
  await page.goto("/account/login");
  await page.locator('input[type="email"]').fill("nonexistent-user@example.com");
  await page.locator('input[type="password"]').fill("wrong-password-but-doesnt-matter");
  await page.locator('input[type="password"]').press("Enter");
  // Wrong credentials — the important thing is the form was *submitted*
  // (a request fired and an error came back), not that login succeeded.
  await expect(page.getByText(/could not sign in|invalid/i)).toBeVisible({ timeout: 10_000 });
});

test("pressing Enter in the admin login password field submits the form", async ({ page }) => {
  const { username, password } = readAdminCredentials();
  await page.goto("/admin");
  await page.locator("input").first().fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press("Enter");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible({ timeout: 10_000 });
});

test("pressing Enter in the checkout discount code field applies the code, not the order", async ({ page }) => {
  // Add something to the cart first via a real product's detail page.
  await addAnInStockProductToCart(page);

  // Navigate to checkout via the app's own client-side routing (cart ->
  // checkout), not a hard page.goto("/checkout") — a fresh full
  // navigation there re-mounts the store's cart/catalog state from
  // scratch, and the checkout page's "redirect to /cart if empty" effect
  // can fire before localStorage cart hydration finishes, racing it back
  // to /cart. Going through /cart first with real clicks avoids that.
  await page.goto("/cart");
  await page.getByRole("button", { name: /checkout/i }).click();
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 10_000 });

  const discountInput = page.getByPlaceholder("Discount code");
  await discountInput.fill("THIS-CODE-DOES-NOT-EXIST");
  await discountInput.press("Enter");

  // Should show a discount validation error, NOT navigate away to
  // checkout/success (which would mean the whole order form submitted).
  await expect(page.getByText(/isn't valid|not valid/i)).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(/\/checkout$/);
});
