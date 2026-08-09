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

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  // Archived products are hidden from public storefront visitors, but the
  // admin dashboard (which reuses this same endpoint for its catalog
  // state) needs to see them too, so it can offer an "unarchive" action.
  const session = await getSessionFromRequest(req);
  const where: Record<string, unknown> = session ? {} : { archived: false };

  const url = new URL(req.url);
  const cat = url.searchParams.get("cat") || "";
  if (cat && cat !== "All") where.cat = cat;

  // Callers that don't ask for pagination get the exact legacy response
  // shape (a bare array, every field including variants) — this is what
  // lib/store.tsx's app-wide catalog fetch, the admin dashboard, cart
  // line lookups, and the product detail page's "related products" all
  // still rely on. Only the shop/browse page asks for pagination, since
  // it's the one place a user actually pages through the catalog and the
  // one place returning all ~150 products + ~2000 variant rows on every
  // filter/sort/page change was wasteful.
  const paginated = url.searchParams.has("page") || url.searchParams.has("pageSize");
  if (!paginated) {
    const rows = await prisma.product.findMany({ where, include: { variants: true }, orderBy: { id: "asc" } });
    return NextResponse.json(rows.map(serializeProduct));
  }

  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const tags = (url.searchParams.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean);
  const sort = url.searchParams.get("sort") || "featured";
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page"))) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(url.searchParams.get("pageSize"))) || DEFAULT_PAGE_SIZE));

  // tags/colors are stored as serialized JSON strings (not a native
  // json/jsonb column), so they can't be filtered in the WHERE clause —
  // fetch matching-category rows without their (often bulky) variants
  // first, filter/sort in JS same as the shop page always has, then run
  // a second targeted query for variants of just the current page's ids.
  const baseRows = await prisma.product.findMany({ where, orderBy: { id: "asc" } });
  let list = baseRows.map((r) => serializeProduct({ ...r, variants: [] }));
  if (q) list = list.filter((p) => (p.name + " " + p.cat).toLowerCase().includes(q));
  if (tags.length) list = list.filter((p) => tags.every((t) => p.tags.includes(t)));
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  else if (sort === "high") list.sort((a, b) => b.price - a.price);
  else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === "new") list.sort((a, b) => (b.tags.includes("New") ? 1 : 0) - (a.tags.includes("New") ? 1 : 0));

  const total = list.length;
  const pageIds = list.slice((page - 1) * pageSize, page * pageSize).map((p) => p.id);
  const pageRows = pageIds.length
    ? await prisma.product.findMany({ where: { id: { in: pageIds } }, include: { variants: true } })
    : [];
  const byId = new Map(pageRows.map((r) => [r.id, r]));
  const products = pageIds.map((id) => byId.get(id)).filter((r): r is (typeof pageRows)[number] => r != null).map(serializeProduct);

  return NextResponse.json({
    products,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
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

  const images = Array.isArray(body.images) ? body.images.filter((x: unknown): x is string => typeof x === "string") : null;
  const imgId = images?.length ? images[0] : typeof body.imgId === "string" ? body.imgId : "";

  const created = await prisma.product.create({
    data: {
      name,
      cat,
      price: Number(body.price) || 0,
      wasPrice: body.wasPrice != null ? Number(body.wasPrice) : null,
      imgId,
      images: JSON.stringify(images?.length ? images : imgId ? [imgId] : []),
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
