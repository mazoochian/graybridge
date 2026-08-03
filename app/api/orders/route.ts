import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { serializeOrder } from "@/lib/order-serializer";

const ALLOWED_STATUSES = ["Processing", "Shipped", "Fulfilled", "Refunded"];
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page"))) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(url.searchParams.get("pageSize"))) || DEFAULT_PAGE_SIZE));

  const where: Record<string, unknown> = {};
  if (status && ALLOWED_STATUSES.includes(status)) where.status = status;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [orders, total, recent] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
    // 30-day KPI cards are deliberately unfiltered — they summarize the
    // whole store, not the current search/filter view.
    prisma.order.findMany({ where: { createdAt: { gte: since }, paymentStatus: "paid" }, include: { items: true } }),
  ]);

  const revenue30d = recent.reduce((n, o) => n + o.total, 0);
  const orders30d = recent.length;
  const units30d = recent.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0);
  const aov30d = orders30d ? revenue30d / orders30d : 0;

  return NextResponse.json({
    orders: orders.map(serializeOrder),
    stats: { revenue30d, orders30d, aov30d, units30d },
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
