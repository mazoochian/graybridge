import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSessionFromRequest } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Toggles the caller's "helpful" vote on a review.
 *
 * POST is a toggle rather than separate add/remove verbs because the UI
 * is a single button whose meaning depends on current state — modelling
 * it as one idempotent-per-intent call avoids the client and server
 * disagreeing about whether a vote already exists.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Please sign in to vote." }, { status: 401 });

  const ip = getClientIp(req);
  const limit = checkRateLimit(`review-vote:customer:${session.customerId}`, { max: 120, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const ipLimit = checkRateLimit(`review-vote:ip:${ip}`, { max: 300, windowMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
    );
  }

  const reviewId = Number((await params).id);
  if (!Number.isInteger(reviewId)) {
    return NextResponse.json({ error: "Invalid review id." }, { status: 400 });
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, customerId: true } });
  if (!review) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  if (review.customerId === session.customerId) {
    return NextResponse.json({ error: "You can't vote on your own review." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.reviewVote.findUnique({
      where: { reviewId_customerId: { reviewId, customerId: session.customerId } },
      select: { id: true },
    });

    if (existing) {
      await tx.reviewVote.delete({ where: { id: existing.id } });
    } else {
      await tx.reviewVote.create({ data: { reviewId, customerId: session.customerId } });
    }

    // Recount inside the transaction rather than incrementing, so the
    // stored total can't drift from the vote rows it summarizes.
    const helpful = await tx.reviewVote.count({ where: { reviewId } });
    await tx.review.update({ where: { id: reviewId }, data: { helpful } });
    return { helpful, voted: !existing };
  });

  return NextResponse.json({ ok: true, ...result });
}
