import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { serializeOrder } from "@/lib/order-serializer";

const ALLOWED_STATUSES = ["Processing", "Shipped", "Fulfilled", "Refunded"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const id = Number((await params).id);
  const body = await req.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (body?.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `status must be one of ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });
    }
    data.status = body.status;
  }
  if (typeof body?.carrier === "string") data.carrier = body.carrier.trim();
  if (typeof body?.trackingNumber === "string") data.trackingNumber = body.trackingNumber.trim();

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    const updated = await prisma.order.update({ where: { id }, data, include: { items: true } });
    return NextResponse.json(serializeOrder(updated));
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
