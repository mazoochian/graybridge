import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSessionFromRequest } from "@/lib/customer-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const productId = Number((await params).productId);
  await prisma.wishlistItem.deleteMany({ where: { customerId: session.customerId, productId } });
  return NextResponse.json({ ok: true });
}
