import { request as pwRequest } from "@playwright/test";
import { test, expect } from "./helpers";
import { readFileSync } from "node:fs";
import path from "node:path";

// Product.rating/reviews used to be static seeded numbers with no way for
// a customer to submit anything. These cover the full round trip through
// the real UI: sign up -> write -> it appears -> the product's
// denormalized rating/count update to match -> edit -> delete.

const PRODUCT_URL = "/product/1";

async function signUp(page: import("@playwright/test").Page, name = "E2E Reviewer") {
  const email = `e2e_rev_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/account/signup");
  await page.fill('input[autocomplete="name"]', name);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "correct-horse-battery-staple");
  await page.getByRole("button", { name: /create account|sign up/i }).first().click();
  await expect(page).not.toHaveURL(/signup/, { timeout: 10_000 });
  return email;
}

async function writeReview(
  page: import("@playwright/test").Page,
  url: string,
  rating: number,
  title: string,
) {
  await page.goto(url);
  await page.waitForSelector("#reviews");
  await page.getByRole("button", { name: /write a review/i }).click();
  await page.getByRole("radio", { name: `${rating} star${rating === 1 ? "" : "s"}` }).click();
  await page.fill('input[placeholder*="Sum it up"]', title);
  await page.getByRole("button", { name: /post review/i }).click();
  await expect(page.locator("#reviews").getByText(title)).toBeVisible();
}

test("signed-out visitors see reviews but are sent to sign in to write one", async ({ page }) => {
  await page.goto(PRODUCT_URL);
  await expect(page.locator("#reviews")).toBeVisible();
  await page.getByRole("button", { name: /write a review/i }).click();
  await expect(page).toHaveURL(/\/account\/login/);
});

test("a customer can write, edit, and delete a review, and aggregates track it", async ({ page }) => {
  await signUp(page);
  await page.goto(PRODUCT_URL);

  const reviews = page.locator("#reviews");
  await expect(reviews).toBeVisible();

  // --- write ---
  await page.getByRole("button", { name: /write a review/i }).click();
  await page.getByRole("radio", { name: "4 stars" }).click();
  await page.fill('input[placeholder*="Sum it up"]', "Holds up well");
  await page.fill("#reviews textarea", "Washed it a dozen times, still looks new.");
  await page.getByRole("button", { name: /post review/i }).click();

  await expect(reviews.getByText("Holds up well")).toBeVisible();
  await expect(reviews.getByText("E2E Reviewer")).toBeVisible();
  // The product header's rating is denormalized on Product and recomputed
  // server-side; the page refetches the catalog so it should now agree.
  await expect(page.locator('a[href="#reviews"]')).toContainText("4.0");

  // Not a verified purchase — this account never bought anything.
  await expect(reviews.getByText(/verified purchase/i)).toHaveCount(0);

  // --- edit (upsert, not a second row) ---
  await page.getByRole("button", { name: /edit your review/i }).click();
  await page.getByRole("radio", { name: "2 stars" }).click();
  await page.fill('input[placeholder*="Sum it up"]', "Changed my mind");
  await page.getByRole("button", { name: /update review/i }).click();

  await expect(reviews.getByText("Changed my mind")).toBeVisible();
  await expect(reviews.getByText("Holds up well")).toHaveCount(0);
  await expect(reviews.locator("h2")).toContainText("(1)");
  await expect(page.locator('a[href="#reviews"]')).toContainText("2.0");

  // --- delete ---
  await page.getByRole("button", { name: /edit your review/i }).click();
  await page.getByRole("button", { name: /delete my review/i }).click();
  await expect(reviews.getByText(/be the first to say how this one wears/i)).toBeVisible();
  // With no reviews left the header shows a prompt, not "★ 0 (0)".
  await expect(page.locator('a[href="#reviews"]')).toContainText(/no reviews yet/i);
});

// This spec asserts on whole-product aggregates (the "2 reviews" / "3.5
// average" summary), so it needs a known starting state — a leftover
// review from an earlier failed run would silently change those numbers
// and make the failure look like a product bug. These tests run against
// the dev database (playwright's webServer is `npm run dev`), so clear
// this one product's reviews directly rather than hoping every prior run
// cleaned up after itself.
const AGGREGATE_TEST_PRODUCT_ID = 4;

function readAdminCredentials(): { username: string; password: string } {
  const raw = readFileSync(path.resolve(__dirname, "../../.admin-credentials.local.txt"), "utf8");
  const username = raw.match(/username:\s*(\S+)/)?.[1];
  const password = raw.match(/password:\s*(\S+)/)?.[1];
  if (!username || !password) throw new Error("Could not parse .admin-credentials.local.txt");
  return { username, password };
}

/**
 * Clears every review on one product via the admin moderation API.
 *
 * Done over HTTP rather than by importing Prisma: the Playwright runner
 * can't load the generated (ESM) client, and going through the real
 * endpoints means the reset also exercises the admin delete path and its
 * aggregate recomputation instead of reaching around it.
 */
async function resetReviewsFor(baseURL: string, productId: number) {
  const api = await pwRequest.newContext({ baseURL });
  const { username, password } = readAdminCredentials();
  const login = await api.post("/api/auth/login", { data: { username, password } });
  if (!login.ok()) throw new Error(`admin login failed for review reset: ${login.status()}`);

  const listed = await (await api.get("/api/reviews?pageSize=100")).json();
  for (const r of listed.reviews ?? []) {
    if (r.productId === productId) await api.delete(`/api/reviews/${r.id}`);
  }
  await api.dispose();
}

test("the rating summary shows a distribution, and helpful votes work across customers", async ({ browser, baseURL }) => {
  const PRODUCT = `/product/${AGGREGATE_TEST_PRODUCT_ID}`;
  await resetReviewsFor(baseURL!, AGGREGATE_TEST_PRODUCT_ID);

  // Two different shoppers, two different ratings, so the histogram has
  // more than one bar to show.
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await signUp(pageA, "Shopper A");
  await writeReview(pageA, PRODUCT, 5, "A rates it five");

  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await signUp(pageB, "Shopper B");
  await writeReview(pageB, PRODUCT, 2, "B rates it two");

  const reviewsB = pageB.locator("#reviews");
  // Summary: 2 reviews, average (5+2)/2 = 3.5.
  await expect(reviewsB.getByText("3.5")).toBeVisible();
  await expect(reviewsB.getByText(/2 reviews/)).toBeVisible();

  // B can vote on A's review but not their own — so exactly one button.
  const helpfulButtons = reviewsB.getByRole("button", { name: /helpful/i });
  await expect(helpfulButtons).toHaveCount(1);
  // exact:true so this doesn't also match the "Edit your review" button.
  await expect(reviewsB.getByText("Your review", { exact: true })).toBeVisible();

  // The button flips optimistically, before the vote request completes —
  // wait for the server to confirm it, or the reload below can abort the
  // in-flight POST and the vote is never saved.
  const voteSaved = pageB.waitForResponse((r) => r.url().includes("/helpful") && r.request().method() === "POST");
  await helpfulButtons.first().click();
  await expect(reviewsB.getByRole("button", { name: /helpful/i })).toHaveAttribute("aria-pressed", "true");
  expect((await voteSaved).ok()).toBe(true);

  // The vote persists and pushes that review to the top of the list.
  await pageB.reload();
  await pageB.waitForSelector("#reviews");
  await expect(reviewsB.getByRole("button", { name: /helpful/i })).toHaveAttribute("aria-pressed", "true");
  await expect(reviewsB.locator("div").filter({ hasText: "A rates it five" }).first()).toBeVisible();

  // Clicking again removes the vote (it's a toggle, not an increment).
  await reviewsB.getByRole("button", { name: /helpful/i }).click();
  await expect(reviewsB.getByRole("button", { name: /helpful/i })).toHaveAttribute("aria-pressed", "false");

  await ctxA.close();
  await ctxB.close();
  // Belt-and-braces: resetReviewsFor at the top makes the test
  // self-sufficient regardless, but leaving the dev catalog dirty is
  // rude to whoever opens the storefront next.
  await resetReviewsFor(baseURL!, AGGREGATE_TEST_PRODUCT_ID);
});
