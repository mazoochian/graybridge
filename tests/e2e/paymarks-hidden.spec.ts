import { test, expect } from "./helpers";

// The store is still in payment test-mode (lib/payment.ts always
// "succeeds" — no real processor connected). Visa/Mastercard/Amex/
// PayPal/Apple/Google Pay marks used to render on the cart page and
// footer, implying real payment support that doesn't exist. They were
// removed (components/PayMarks.tsx kept but unused, ready to re-wire
// once a real processor is connected) — this pins that down.

test("payment brand marks are not rendered on cart or footer", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByText("VISA")).toHaveCount(0);
  await expect(page.getByText("AMEX")).toHaveCount(0);
  await expect(page.getByText("PayPal", { exact: false })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByText("VISA")).toHaveCount(0);
  await expect(page.getByText("AMEX")).toHaveCount(0);
});
