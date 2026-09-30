import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { serializeProduct } from "@/lib/product-serializer";

interface VariantInput {
  size: string;
  color: string;
  stock: number;
}

function parseVariants(body: unknown): VariantInput[] | null {
  const raw = (body as Record<string, unknown>)?.variants;
  if (!Array.isArray(raw)) return null;
  return raw
    .map((v) => {
      const r = v as Record<string, unknown>;
      return { size: String(r.size ?? ""), color: String(r.color ?? ""), stock: Math.max(0, Number(r.stock) || 0) };
    })
    .filter((v) => v.size && v.color);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const row = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json(serializeProduct(row));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.cat === "string") data.cat = body.cat;
  if (body.price != null) data.price = Number(body.price);
  if (body.wasPrice !== undefined) data.wasPrice = body.wasPrice != null ? Number(body.wasPrice) : null;
  if (typeof body.imgId === "string") data.imgId = body.imgId;
  if (Array.isArray(body.images)) {
    const images = body.images.filter((x: unknown): x is string => typeof x === "string");
    data.images = JSON.stringify(images);
    if (images.length) data.imgId = images[0];
  }
  if (Array.isArray(body.colors)) data.colors = JSON.stringify(body.colors);
  if (Array.isArray(body.tags)) data.tags = JSON.stringify(body.tags);
  if (typeof body.desc === "string") data.desc = body.desc;
  if (typeof body.archived === "boolean") data.archived = body.archived;

  const variants = parseVariants(body);
  if (variants) {
    data.stock = variants.reduce((n, v) => n + v.stock, 0);
  } else if (body.stock != null) {
    data.stock = Number(body.stock);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.productVariant.createMany({ data: variants.map((v) => ({ ...v, productId: id })) });
      }
      return tx.product.update({ where: { id }, data, include: { variants: true } });
    });
    return NextResponse.json(serializeProduct(updated));
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

/**
 * Soft delete: archives the product instead of removing the row. Orders
 * reference products by id (OrderItem.productId, with the name/sku/price
 * separately snapshotted at purchase time) and wishlists do too
 * (WishlistItem.productId) — a hard delete would either violate that
 * history or require cascading cleanup that destroys it. Archived
 * products are excluded from the public storefront's catalog but remain
 * visible (and restorable) in the admin dashboard.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = Number((await params).id);
  try {
    const updated = await prisma.product.update({ where: { id }, data: { archived: true }, include: { variants: true } });
    return NextResponse.json(serializeProduct(updated));
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
