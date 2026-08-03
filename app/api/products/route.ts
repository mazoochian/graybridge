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

export async function GET(req: NextRequest) {
  // Archived products are hidden from public storefront visitors, but the
  // admin dashboard (which reuses this same endpoint for its catalog
  // state) needs to see them too, so it can offer an "unarchive" action.
  const session = await getSessionFromRequest(req);
  const where = session ? {} : { archived: false };
  const rows = await prisma.product.findMany({ where, include: { variants: true }, orderBy: { id: "asc" } });
  return NextResponse.json(rows.map(serializeProduct));
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const cat = typeof body?.cat === "string" ? body.cat : "";
  const sku = typeof body?.sku === "string" ? body.sku : "";
  if (!name || !cat || !sku) {
    return NextResponse.json({ error: "name, cat, and sku are required." }, { status: 400 });
  }

  const variants = parseVariants(body);
  const stock = variants ? variants.reduce((n, v) => n + v.stock, 0) : Number(body.stock) || 0;

  const created = await prisma.product.create({
    data: {
      name,
      cat,
      price: Number(body.price) || 0,
      wasPrice: body.wasPrice != null ? Number(body.wasPrice) : null,
      imgId: typeof body.imgId === "string" ? body.imgId : "",
      colors: JSON.stringify(Array.isArray(body.colors) ? body.colors : []),
      tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      rating: typeof body.rating === "string" ? body.rating : "4.6",
      reviews: Number(body.reviews) || 0,
      stock,
      sku,
      desc: typeof body.desc === "string" ? body.desc : "",
      ord: Number(body._ord) || 0,
      variants: variants ? { create: variants } : undefined,
    },
    include: { variants: true },
  });

  return NextResponse.json(serializeProduct(created), { status: 201 });
}
