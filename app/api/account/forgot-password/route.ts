import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordReset } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const GENERIC_RESPONSE = { ok: true, message: "If that email is registered, we've sent a reset link." };
const TOKEN_TTL_MS = 60 * 60 * 1000;

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`forgot-password:ip:${ip}`, { max: 20, windowMs: 15 * 60 * 1000 });
  if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json(GENERIC_RESPONSE);

  // Per-identifier limit guards against email-bombing one victim's inbox with
  // reset links regardless of source IP. Checked after basic validation but
  // before hitting the DB, and still returns the generic response on the
  // caller's side (no enumeration signal) — the 429 only ever fires after
  // repeated requests for the *same* email.
  const emailLimit = checkRateLimit(`forgot-password:email:${email}`, { max: 3, windowMs: 15 * 60 * 1000 });
  if (!emailLimit.allowed) return rateLimited(emailLimit.retryAfterSeconds);

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
