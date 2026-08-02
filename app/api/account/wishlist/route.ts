import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSessionFromRequest } from "@/lib/customer-auth";
import { serializeProduct } from "@/lib/product-serializer";

export async function GET(req: NextRequest) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const items = await prisma.wishlistItem.findMany({
    where: { customerId: session.customerId },
    orderBy: { createdAt: "desc" },
  });
  const products = await prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, serializeProduct(p)]));

  return NextResponse.json({
    items: items.map((i) => ({ productId: i.productId, product: productMap.get(i.productId) ?? null })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const productId = Number(body?.productId);
  if (!Number.isInteger(productId)) return NextResponse.json({ error: "productId is required." }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  await prisma.wishlistItem.upsert({
    where: { customerId_productId: { customerId: session.customerId, productId } },
    update: {},
    create: { customerId: session.customerId, productId },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
