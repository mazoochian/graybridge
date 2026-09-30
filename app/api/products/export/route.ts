import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { toCsvRow } from "@/lib/csv";

const COLUMNS = ["sku", "name", "cat", "price", "wasPrice", "stock", "rating", "reviews", "colors", "tags", "desc", "imgId"];

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const products = await prisma.product.findMany({ orderBy: { id: "asc" } });
  const lines = [toCsvRow(COLUMNS)];
  for (const p of products) {
    lines.push(
      toCsvRow([
        p.sku,
        p.name,
        p.cat,
        String(p.price),
        p.wasPrice != null ? String(p.wasPrice) : "",
        String(p.stock),
        p.rating,
        String(p.reviews),
        JSON.parse(p.colors).join("|"),
        JSON.parse(p.tags).join("|"),
        p.desc,
        p.imgId,
      ]),
    );
  }

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="graybridge-products.csv"`,
    },
  });
}
