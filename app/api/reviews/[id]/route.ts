import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { recomputeReviewAggregates } from "@/lib/review-aggregates";

/**
 * Admin moderation delete — removes any review by id, regardless of who
 * wrote it. (The customer-facing DELETE at
 * /api/products/[id]/reviews only ever removes the caller's own.)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid review id." }, { status: 400 });
  }

  const existing = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
  if (!existing) return NextResponse.json({ error: "Review not found." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    await recomputeReviewAggregates(tx, existing.productId);
  });

  return NextResponse.json({ ok: true });
}
