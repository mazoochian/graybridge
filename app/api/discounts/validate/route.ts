import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateDiscountCode } from "@/lib/discount";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Public and unauthenticated, and its distinct "isn't valid" vs "no
  // longer active"/"expired" messages make it a code-guessing oracle —
  // throttle per IP like the other public lookup endpoints.
  const limit = checkRateLimit(`discount-validate:ip:${getClientIp(req)}`, { max: 30, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const code = req.nextUrl.searchParams.get("code") || "";
  const subtotal = Number(req.nextUrl.searchParams.get("subtotal")) || 0;
  const result = await validateDiscountCode(prisma, code, subtotal);
  return NextResponse.json(result);
}
