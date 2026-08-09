import { test, expect } from "./helpers";

// The footer used to list Shipping/Returns/Size guide/Contact/Privacy/
// Terms as plain non-clickable text, plus Journal/Stores/Careers which
// had no pages at all. Real pages now exist for the first six and the
// three that don't were removed — this pins down both halves so a dead
// footer link can't come back unnoticed.

const PAGES = [
  { path: "/shipping", heading: "Shipping" },
  { path: "/returns", heading: "Returns & exchanges" },
  { path: "/privacy", heading: "Privacy" },
  { path: "/terms", heading: "Terms of sale" },
  { path: "/size-guide", heading: "Size guide" },
  { path: "/contact", heading: "Contact" },
];

for (const { path, heading } of PAGES) {
  test(`${path} renders with its heading and the site chrome`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    // Footer is part of the (store) layout — confirms these live inside
    // the storefront chrome rather than as bare orphan routes.
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });
}

test("footer help links navigate to the real pages", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");

  await footer.getByText("Shipping", { exact: true }).click();
  await expect(page).toHaveURL(/\/shipping$/);

  await page.goto("/");
  await footer.getByText("Size guide", { exact: true }).click();
  await expect(page).toHaveURL(/\/size-guide$/);

  await page.goto("/");
  await footer.getByText("Privacy", { exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
});

test("footer no longer lists pages that do not exist", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByText("Journal", { exact: true })).toHaveCount(0);
  await expect(footer.getByText("Stores", { exact: true })).toHaveCount(0);
  await expect(footer.getByText("Careers", { exact: true })).toHaveCount(0);
  await expect(footer.getByText("Accessibility", { exact: true })).toHaveCount(0);
});
