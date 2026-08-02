import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerSessionFromRequest } from "@/lib/customer-auth";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function GET(req: NextRequest) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { customerId: session.customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  const session = await getCustomerSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const addressLine1 = typeof body?.addressLine1 === "string" ? body.addressLine1.trim() : "";
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const region = typeof body?.region === "string" ? body.region.trim() : "";
  const postalCode = typeof body?.postalCode === "string" ? body.postalCode.trim() : "";
  const country = typeof body?.country === "string" ? body.country.trim() : "";
  if (![addressLine1, city, region, postalCode, country].every(isNonEmptyString)) {
    return NextResponse.json({ error: "A complete address is required." }, { status: 400 });
  }
  const isDefault = Boolean(body?.isDefault);

  const created = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({ where: { customerId: session.customerId }, data: { isDefault: false } });
    }
    return tx.address.create({
      data: {
        customerId: session.customerId,
        label: typeof body?.label === "string" ? body.label.trim() : "",
        addressLine1,
        addressLine2: typeof body?.addressLine2 === "string" ? body.addressLine2.trim() : "",
        city,
        region,
        postalCode,
        country,
        phone: typeof body?.phone === "string" ? body.phone.trim() : "",
        isDefault,
      },
    });
  });

  return NextResponse.json(created, { status: 201 });
}
