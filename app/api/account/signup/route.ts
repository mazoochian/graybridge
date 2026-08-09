import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_SESSION_COOKIE, signCustomerSession } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many signup attempts. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`signup:ip:${ip}`, { max: 8, windowMs: 60 * 60 * 1000 });
  if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const customer = await prisma.customer.create({ data: { name, email, passwordHash } });

  const token = await signCustomerSession({ customerId: customer.id, email: customer.email });
  const res = NextResponse.json({ ok: true, name: customer.name, email: customer.email }, { status: 201 });
  res.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
