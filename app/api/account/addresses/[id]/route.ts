import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSessionFromRequest } from "@/lib/customer-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = Number((await params).id);
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.customerId !== session.customerId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  for (const key of ["label", "addressLine1", "addressLine2", "city", "region", "postalCode", "country", "phone"] as const) {
    if (typeof body?.[key] === "string") data[key] = body[key].trim();
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (body?.isDefault === true) {
      await tx.address.updateMany({ where: { customerId: session.customerId }, data: { isDefault: false } });
      data.isDefault = true;
    } else if (body?.isDefault === false) {
      data.isDefault = false;
    }
    return tx.address.update({ where: { id }, data });
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = Number((await params).id);
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.customerId !== session.customerId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
