import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { serializeOrder } from "@/lib/order-serializer";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [orders, recent] = await Promise.all([
    prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.order.findMany({ where: { createdAt: { gte: since }, paymentStatus: "paid" }, include: { items: true } }),
  ]);

  const revenue30d = recent.reduce((n, o) => n + o.total, 0);
  const orders30d = recent.length;
  const units30d = recent.reduce((n, o) => n + o.items.reduce((m, i) => m + i.qty, 0), 0);
  const aov30d = orders30d ? revenue30d / orders30d : 0;

  return NextResponse.json({
    orders: orders.map(serializeOrder),
    stats: { revenue30d, orders30d, aov30d, units30d },
  });
}
