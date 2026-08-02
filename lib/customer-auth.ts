import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export const CUSTOMER_SESSION_COOKIE = "gb_customer";
const SESSION_TTL = "30d";
const KIND = "customer";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface CustomerSessionPayload {
  customerId: number;
  email: string;
}

export async function signCustomerSession(payload: CustomerSessionPayload): Promise<string> {
  return new SignJWT({ ...payload, kind: KIND })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());
}

export async function verifyCustomerSession(token: string): Promise<CustomerSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.kind !== KIND || typeof payload.customerId !== "number" || typeof payload.email !== "string") {
      return null;
    }
    return { customerId: payload.customerId, email: payload.email };
  } catch {
    return null;
  }
}

export async function getCustomerSessionFromRequest(req: NextRequest): Promise<CustomerSessionPayload | null> {
  const token = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyCustomerSession(token);
}
