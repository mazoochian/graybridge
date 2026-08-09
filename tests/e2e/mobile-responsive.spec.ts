import { test, expect, addAnInStockProductToCart } from "./helpers";

// The site had zero media queries and no mobile nav: every page overflowed
// horizontally at phone widths, traced to (a) the header's nav+search row
// not wrapping and (b) several grid-template-columns using bare `fr`
// tracks, which respect a child's min-content size instead of the
// available space — a 60px heading's single word could force a 2-column
// grid wider than the viewport well before any breakpoint was reached.
// Both classes of bug are pinned down here at the narrowest width tested
// anywhere else in this suite (375px) plus one steeper check (320px, the
// classic "smallest common phone" width) on the pages most likely to
// regress: the homepage (the original repro case) and checkout (the
// deepest nested grid-of-grids in the app).

async function hasHorizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 0.5);
}

test.describe("no horizontal overflow at phone widths", () => {
  for (const width of [375, 320]) {
    test(`homepage fits a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.locator(".gb-cols-4 > div").first()).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }

  test("checkout (the deepest nested grid layout) fits a 320px viewport", async ({ page }) => {
    await addAnInStockProductToCart(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/checkout");
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});

test.describe("mobile nav menu", () => {
  test.use({ viewport: { width: 390, height: 900 } });

  test("desktop nav is hidden and the hamburger opens a working menu", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".gb-header-desktop-nav").first()).not.toBeVisible();

    const hamburger = page.locator(".gb-header-hamburger");
    await hamburger.click();
    const panel = page.locator(".gb-mobile-menu-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByPlaceholder("Search the shop")).toBeVisible();

    await panel.getByText("Knitwear", { exact: true }).click();
    await expect(page).toHaveURL(/cat=Knitwear/);
    await expect(panel).not.toBeVisible();
  });
});
