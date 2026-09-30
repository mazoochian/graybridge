import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { distributeVariants } from "@/lib/catalog";

export const runtime = "nodejs";

function col(headers: string[], row: string[], name: string): string {
  const idx = headers.indexOf(name);
  return idx === -1 ? "" : (row[idx] ?? "").trim();
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return NextResponse.json({ error: "CSV has no data rows." }, { status: 400 });

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1);

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2;
    try {
      const sku = col(headers, row, "sku");
      const name = col(headers, row, "name");
      const cat = col(headers, row, "cat");
      if (!sku) throw new Error("missing sku");

      const priceStr = col(headers, row, "price");
      const wasPriceStr = col(headers, row, "wasprice");
      const stockStr = col(headers, row, "stock");
      const rating = col(headers, row, "rating");
      const reviewsStr = col(headers, row, "reviews");
      const colorsStr = col(headers, row, "colors");
      const tagsStr = col(headers, row, "tags");
      const desc = col(headers, row, "desc");
      const imgId = col(headers, row, "imgid");

      const existing = await prisma.product.findUnique({ where: { sku } });
      const colors = colorsStr ? colorsStr.split("|").map((c) => c.trim()).filter(Boolean) : null;
      const tags = tagsStr ? tagsStr.split("|").map((t) => t.trim()).filter(Boolean) : null;

      const data: Record<string, unknown> = {};
      if (name) data.name = name;
      if (cat) data.cat = cat;
      if (priceStr) data.price = Number(priceStr) || 0;
      if (wasPriceStr) data.wasPrice = Number(wasPriceStr);
      if (rating) data.rating = rating;
      if (reviewsStr) data.reviews = Number(reviewsStr) || 0;
      if (colors) data.colors = JSON.stringify(colors);
      if (tags) data.tags = JSON.stringify(tags);
      if (desc) data.desc = desc;
      if (imgId) {
        data.imgId = imgId;
        // images[0] is the cover and must track imgId (see schema) —
        // otherwise the product page gallery keeps showing the old cover.
        const prevImages: string[] = existing ? JSON.parse(existing.images || "[]") : [];
        data.images = JSON.stringify([imgId, ...prevImages.slice(1).filter((x) => x !== imgId)]);
      }

      let productId: number;
      if (existing) {
        const saved = await prisma.product.update({ where: { sku }, data });
        productId = saved.id;
        updated++;
      } else {
        if (!name || !cat || !priceStr) throw new Error("new product requires name, cat, and price");
        const created_ = await prisma.product.create({
          data: {
            sku,
            name,
            cat,
            price: Number(priceStr) || 0,
            wasPrice: wasPriceStr ? Number(wasPriceStr) : null,
            imgId: imgId || "",
            colors: JSON.stringify(colors ?? ["Ecru", "Black"]),
            tags: JSON.stringify(tags ?? []),
            rating: rating || "4.6",
            reviews: reviewsStr ? Number(reviewsStr) || 0 : 0,
            desc,
          },
        });
        productId = created_.id;
        created++;
      }

      if (stockStr) {
        const stock = Math.max(0, Number(stockStr) || 0);
        const finalColors = colors ?? JSON.parse((existing?.colors ?? JSON.stringify(colors ?? ["Ecru", "Black"])) as string);
        const variants = distributeVariants(finalColors, stock);
        await prisma.$transaction([
          prisma.productVariant.deleteMany({ where: { productId } }),
          prisma.productVariant.createMany({ data: variants.map((v) => ({ ...v, productId })) }),
          prisma.product.update({ where: { id: productId }, data: { stock } }),
        ]);
      }
    } catch (e) {
      errors.push(`Row ${rowNum}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
