import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordReset } from "@/lib/mail";

const GENERIC_RESPONSE = { ok: true, message: "If that email is registered, we've sent a reset link." };
const TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json(GENERIC_RESPONSE);

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (customer) {
    const raw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    await prisma.passwordResetToken.create({
      data: { customerId: customer.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });
    const resetUrl = `${req.nextUrl.origin}/account/reset-password?token=${raw}`;
    sendPasswordReset({ email: customer.email, name: customer.name, resetUrl }).catch((e) =>
      console.error("[forgot-password] email failed:", e),
    );
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
