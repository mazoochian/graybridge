import type { prisma } from "@/lib/prisma";

/** The transactional client handed to a `prisma.$transaction(async (tx) => …)` callback. */
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Recomputes Product.rating / Product.reviews from the review rows.
 *
 * Always call this inside the same transaction as the review write that
 * triggered it, so the denormalized aggregates on Product can't drift
 * from the rows they summarize. Shared by the customer-facing route
 * (app/api/products/[id]/reviews) and admin moderation
 * (app/api/reviews/[id]) precisely so there's one definition of "what
 * the rating means" rather than two that can diverge.
 *
 * Note this deliberately replaces the seeded placeholder rating/review
 * counts once a product has any real review — those seeded numbers are
 * made-up marketing data (lib/catalog.ts generates them), and blending
 * them with real customer ratings would misrepresent both. A product
 * with no reviews goes to "0"/0, which the storefront renders as
 * "No reviews yet" rather than "★ 0 (0)".
 */
export async function recomputeReviewAggregates(tx: TxClient, productId: number): Promise<void> {
  const agg = await tx.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  await tx.product.update({
    where: { id: productId },
    data: {
      reviews: count,
      rating: count > 0 ? (agg._avg.rating ?? 0).toFixed(1) : "0",
    },
  });
}
