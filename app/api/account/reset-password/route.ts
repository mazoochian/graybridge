import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_SESSION_COOKIE, signCustomerSession } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`reset-password:ip:${ip}`, { max: 10, windowMs: 15 * 60 * 1000 });
  if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token) return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const customer = await prisma.$transaction(async (tx) => {
    // Claim the token with a guarded update rather than trusting the read
    // above: two concurrent submissions of the same link would otherwise
    // both pass the usedAt check and both succeed.
    const now = new Date();
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count === 0) return null;
    // Any other outstanding reset links for this account are now stale —
    // retire them so an older email can't be used to reset again.
    await tx.passwordResetToken.updateMany({
      where: { customerId: record.customerId, usedAt: null },
      data: { usedAt: now },
    });
    return tx.customer.update({ where: { id: record.customerId }, data: { passwordHash } });
  });
  if (!customer) return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });

  const sessionToken = await signCustomerSession({ customerId: customer.id, email: customer.email });
  const res = NextResponse.json({ ok: true, name: customer.name, email: customer.email });
  res.cookies.set(CUSTOMER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
