import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";
import { normalizeCode } from "@/lib/discount";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const codes = await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(codes);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = normalizeCode(typeof body?.code === "string" ? body.code : "");
  const type = body?.type === "fixed" ? "fixed" : "percent";
  const value = Number(body?.value);
  if (!code) return NextResponse.json({ error: "Code is required." }, { status: 400 });
  // Stored as an Int, so anything that rounds to 0 would create a no-op code.
  if (!Number.isFinite(value) || Math.round(value) < 1) return NextResponse.json({ error: "Value must be at least 1." }, { status: 400 });
  if (type === "percent" && value > 100) return NextResponse.json({ error: "Percent value can't exceed 100." }, { status: 400 });

  const minSubtotal = Math.max(0, Number(body?.minSubtotal) || 0);
  let usageLimit: number | null = null;
  if (body?.usageLimit != null && body.usageLimit !== "") {
    usageLimit = Number(body.usageLimit);
    if (!Number.isInteger(usageLimit) || usageLimit < 1) {
      return NextResponse.json({ error: "Usage limit must be a whole number of at least 1." }, { status: 400 });
    }
  }
  let expiresAt: Date | null = null;
  if (body?.expiresAt) {
    expiresAt = new Date(body.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
  }

  const existing = await prisma.discountCode.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "A code with that name already exists." }, { status: 409 });

  const created = await prisma.discountCode.create({
    data: {
      code,
      type,
      value: Math.round(value),
      minSubtotal: Math.round(minSubtotal),
      usageLimit,
      expiresAt,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
