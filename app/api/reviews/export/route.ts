import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { neutralizeFormula, toCsvRow } from "@/lib/csv";

const COLUMNS = [
  "id",
  "productId",
  "productSku",
  "productName",
  "author",
  "email",
  "rating",
  "verified",
  "helpful",
  "title",
  "body",
  "createdAt",
];

/**
 * Export-only — there is deliberately no review *import* counterpart.
 * Reviews are first-party customer statements attributed to a real
 * account; letting them be bulk-loaded from a spreadsheet would make the
 * "Verified purchase" badge and the author attribution meaningless.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const rows = await prisma.review.findMany({
    orderBy: { id: "asc" },
    include: {
      customer: { select: { name: true, email: true } },
      product: { select: { name: true, sku: true } },
    },
  });

  const lines = [toCsvRow(COLUMNS)];
  for (const r of rows) {
    lines.push(
      toCsvRow([
        String(r.id),
        String(r.productId),
        r.product.sku,
        r.product.name,
        // Author name, email, title and body are customer-supplied.
        neutralizeFormula(r.customer.name),
        neutralizeFormula(r.customer.email),
        String(r.rating),
        r.verified ? "yes" : "no",
        String(r.helpful),
        neutralizeFormula(r.title),
        neutralizeFormula(r.body),
        r.createdAt.toISOString(),
      ]),
    );
  }

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="graybridge-reviews.csv"`,
    },
  });
}
