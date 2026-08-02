import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (admin.role !== "owner") return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  const admins = await prisma.adminUser.findMany({ select: { id: true, username: true, role: true }, orderBy: { id: "asc" } });
  return NextResponse.json(admins);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (admin.role !== "owner") return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role === "owner" ? "owner" : "staff";
  if (!username) return NextResponse.json({ error: "Username is required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) return NextResponse.json({ error: "That username is taken." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await prisma.adminUser.create({ data: { username, passwordHash, role } });
  return NextResponse.json({ id: created.id, username: created.username, role: created.role }, { status: 201 });
}
