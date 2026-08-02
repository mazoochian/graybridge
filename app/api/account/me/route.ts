import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSessionFromRequest } from "@/lib/customer-auth";

export async function GET(req: NextRequest) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ authed: false });

  const customer = await prisma.customer.findUnique({ where: { id: session.customerId } });
  if (!customer) return NextResponse.json({ authed: false });

  return NextResponse.json({ authed: true, name: customer.name, email: customer.email });
}
