import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.active === "boolean") data.active = body.active;

  try {
    const updated = await prisma.discountCode.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = Number((await params).id);
  try {
    await prisma.discountCode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
