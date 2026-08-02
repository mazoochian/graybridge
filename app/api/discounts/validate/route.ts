import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateDiscountCode } from "@/lib/discount";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const subtotal = Number(req.nextUrl.searchParams.get("subtotal")) || 0;
  const result = await validateDiscountCode(prisma, code, subtotal);
  return NextResponse.json(result);
}
