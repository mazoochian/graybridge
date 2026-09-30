import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

/**
 * Admin-side review moderation list. Distinct from the public,
 * per-product GET at /api/products/[id]/reviews — this one spans every
 * product, requires an admin session, and exposes the reviewer's email
 * so abuse can be traced back to an account.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const ratingParam = Math.trunc(Number(url.searchParams.get("rating")));
  const rating = ratingParam >= 1 && ratingParam <= 5 ? ratingParam : null;
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page"))) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(Number(url.searchParams.get("pageSize"))) || DEFAULT_PAGE_SIZE),
  );

  const where: Record<string, unknown> = {};
  if (rating) where.rating = rating;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
      { customer: { is: { name: { contains: q, mode: "insensitive" } } } },
      { customer: { is: { email: { contains: q, mode: "insensitive" } } } },
      { product: { is: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customer: { select: { name: true, email: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({
    reviews: rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product.name,
      author: r.customer.name,
      email: r.customer.email,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      createdAt: r.createdAt,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
