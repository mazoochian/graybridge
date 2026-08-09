import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSessionFromRequest } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { recomputeReviewAggregates } from "@/lib/review-aggregates";

const MAX_TITLE = 120;
const MAX_BODY = 2000;

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const productId = Number((await params).id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  // Needed before the query so the caller's own votes can be included in
  // the same round trip rather than a second request.
  const session = await getCustomerSessionFromRequest(req);

  const [rows, grouped] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      // Most-helpful first, newest as the tiebreak — so the reviews a
      // shopper sees first are the ones other shoppers found useful,
      // not merely the most recent.
      orderBy: [{ helpful: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        customer: { select: { name: true } },
        votes: session ? { where: { customerId: session.customerId }, select: { id: true } } : false,
      },
    }),
    // Grouped over *all* reviews for this product, not just the 100 rows
    // returned above, so the histogram stays accurate past that cap.
    prisma.review.groupBy({
      by: ["rating"],
      where: { productId },
      _count: { _all: true },
    }),
  ]);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of grouped) distribution[g.rating] = g._count._all;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const average = total > 0 ? [1, 2, 3, 4, 5].reduce((sum, n) => sum + n * distribution[n], 0) / total : 0;

  return NextResponse.json({
    total,
    average: Number(average.toFixed(1)),
    distribution,
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      author: r.customer.name,
      createdAt: r.createdAt,
      helpful: r.helpful,
      // `mine` drives the edit affordance; `votedByMe` drives the
      // helpful button's pressed state.
      mine: session ? r.customerId === session.customerId : false,
      votedByMe: session && Array.isArray(r.votes) ? r.votes.length > 0 : false,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Please sign in to write a review." }, { status: 401 });

  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`review:ip:${ip}`, { max: 20, windowMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);
  const userLimit = checkRateLimit(`review:customer:${session.customerId}`, { max: 10, windowMs: 60 * 60 * 1000 });
  if (!userLimit.allowed) return rateLimited(userLimit.retryAfterSeconds);

  const productId = Number((await params).id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
  }
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, MAX_TITLE) : "";
  const text = typeof body?.body === "string" ? body.body.trim().slice(0, MAX_BODY) : "";

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, archived: true } });
  if (!product || product.archived) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  // "Verified purchase" = this customer has an order containing this
  // product. Computed once, at write time, and stored — see schema.
  const purchased = await prisma.orderItem.findFirst({
    where: { productId, order: { customerId: session.customerId } },
    select: { id: true },
  });

  const review = await prisma.$transaction(async (tx) => {
    const saved = await tx.review.upsert({
      where: { productId_customerId: { productId, customerId: session.customerId } },
      create: {
        productId,
        customerId: session.customerId,
        rating,
        title,
        body: text,
        verified: !!purchased,
      },
      update: { rating, title, body: text, verified: !!purchased },
    });
    await recomputeReviewAggregates(tx, productId);
    return saved;
  });

  return NextResponse.json({ ok: true, id: review.id, verified: review.verified }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const productId = Number((await params).id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // deleteMany (not delete) so removing a review that isn't there is a
    // no-op rather than a throw — and scoping by customerId means one
    // customer can never delete another's review.
    await tx.review.deleteMany({ where: { productId, customerId: session.customerId } });
    await recomputeReviewAggregates(tx, productId);
  });

  return NextResponse.json({ ok: true });
}
