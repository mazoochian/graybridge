import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** Short unique suffix for test-created rows (SKUs, emails, usernames, discount codes). */
export function uniq(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export function jsonRequest(url: string, body: unknown, init?: { method?: string; headers?: Record<string, string> }) {
  return new NextRequest(url, {
    method: init?.method ?? "POST",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    body: JSON.stringify(body),
  });
}

interface TestProductOpts {
  price?: number;
  stock?: number;
  colors?: string[];
}

/** Creates a single-variant test product (one color, one size: "M") with the given stock, returns the product row + its lone variant. */
export async function createTestProduct(opts: TestProductOpts = {}) {
  const price = opts.price ?? 40;
  const stock = opts.stock ?? 5;
  const color = opts.colors?.[0] ?? "Black";
  const sku = uniq("TEST-SKU");
  const product = await prisma.product.create({
    data: {
      name: `Test Product ${sku}`,
      cat: "test",
      price,
      imgId: "test-img",
      colors: JSON.stringify([color]),
      tags: JSON.stringify([]),
      rating: "0",
      reviews: 0,
      stock,
      sku,
      desc: "",
      variants: { create: [{ size: "M", color, stock }] },
    },
    include: { variants: true },
  });
  return { product, variant: product.variants[0] };
}

export async function deleteTestProduct(productId: number) {
  await prisma.orderItem.deleteMany({ where: { productId } });
  await prisma.productVariant.deleteMany({ where: { productId } });
  await prisma.product.deleteMany({ where: { id: productId } });
}

export async function deleteOrdersByEmail(email: string) {
  const orders = await prisma.order.findMany({ where: { email }, select: { id: true } });
  const ids = orders.map((o) => o.id);
  if (!ids.length) return;
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });
}

export const VALID_ADDRESS = {
  line1: "123 Test St",
  line2: "",
  city: "Testville",
  region: "CA",
  postalCode: "90210",
  country: "US",
  phone: "",
};
