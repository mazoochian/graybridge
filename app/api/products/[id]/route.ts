import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
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
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.cat === "string") data.cat = body.cat;
  if (body.price != null) data.price = Number(body.price);
  if (body.wasPrice !== undefined) data.wasPrice = body.wasPrice != null ? Number(body.wasPrice) : null;
  if (typeof body.imgId === "string") data.imgId = body.imgId;
  if (Array.isArray(body.colors)) data.colors = JSON.stringify(body.colors);
  if (Array.isArray(body.tags)) data.tags = JSON.stringify(body.tags);
  if (typeof body.desc === "string") data.desc = body.desc;

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
