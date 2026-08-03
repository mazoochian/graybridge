import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check for the VPS's process manager / reverse proxy (systemd
 * watchdog, pm2, Docker HEALTHCHECK, nginx upstream check, etc). No auth
 * — health checks need to be reachable without a session. Verifies the
 * database is actually reachable, not just that the Node process is
 * alive, since "process up but DB unreachable" is exactly the failure
 * mode a process manager should be able to detect and act on.
 *
 * Forced dynamic: this route has no cookies/headers/searchParams usage,
 * so Next would otherwise statically optimize it at build time and just
 * keep serving that one build-time response forever — useless for an
 * actual liveness check.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok", time: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { status: "error", db: "unreachable", message: e instanceof Error ? e.message : "unknown error" },
      { status: 503 },
    );
  }
}
