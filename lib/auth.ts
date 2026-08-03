import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "gb_session";
const SESSION_TTL = "7d";
const KIND = "admin";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  username: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, kind: KIND })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    // Tokens signed before this `kind` claim existed have no `kind` at
    // all — treat those as valid too (forward-compatible check) so this
    // doesn't invalidate already-issued sessions. Anything with an
    // explicit, wrong kind (e.g. a customer token) is rejected.
    if (payload.kind !== undefined && payload.kind !== KIND) return null;
    if (typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Looks up the current admin's role fresh from the DB rather than trusting
 * the JWT — so a role downgrade takes effect immediately instead of only
 * after the token expires.
 */
export async function getAdminFromRequest(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return null;
  return prisma.adminUser.findUnique({ where: { username: session.username } });
}
