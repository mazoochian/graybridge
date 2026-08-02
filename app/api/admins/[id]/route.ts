import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromRequest } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (admin.role !== "owner") return NextResponse.json({ error: "Owner access required." }, { status: 403 });

  const id = Number((await params).id);
  if (id === admin.id) return NextResponse.json({ error: "You can't remove your own account." }, { status: 400 });

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (target.role === "owner") {
    const ownerCount = await prisma.adminUser.count({ where: { role: "owner" } });
    if (ownerCount <= 1) return NextResponse.json({ error: "Can't remove the last owner." }, { status: 400 });
  }

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
