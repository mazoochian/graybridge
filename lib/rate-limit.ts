import type { NextRequest } from "next/server";

/**
 * In-memory fixed-window rate limiter. Deliberately simple: Graybridge
 * deploys as a single Node process on one VPS (see NOTES.md), not
 * serverless/multi-instance behind a load balancer, so a per-process
 * in-memory store is sufficient. If that deployment shape ever changes,
 * swap this for a shared store (Redis, etc) — every call site goes
 * through `checkRateLimit`, so only this file would need to change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX = 10;

let lastSweep = Date.now();

// Opportunistic cleanup (on ~every window) so the map doesn't grow
// unboundedly over the life of a long-running process.
function sweep(now: number) {
  if (now - lastSweep < DEFAULT_WINDOW_MS) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller may retry. 0 when allowed. */
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  opts?: { max?: number; windowMs?: number },
): RateLimitResult {
  const max = opts?.max ?? DEFAULT_MAX;
  const windowMs = opts?.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  sweep(now);

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test-only escape hatch so specs don't bleed rate-limit state into each other. */
export function __resetRateLimitStoreForTests() {
  store.clear();
}

/**
 * Best-effort client IP for rate-limit keys, assuming one reverse proxy in
 * front of the app. X-Forwarded-For is read from the *right*: proxies
 * append the address they actually saw (nginx's
 * `$proxy_add_x_forwarded_for`, Caddy, Traefik all do by default), while
 * everything to its left is whatever the client chose to send. Taking the
 * leftmost entry would let a client rotate a fake value on every request
 * and bypass the per-IP limits. X-Real-IP is only a fallback, since it's
 * client-controlled unless the proxy is configured to overwrite it.
 */
export function getClientIp(req: NextRequest | Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const last = xff.split(",").map((s) => s.trim()).filter(Boolean).pop();
    if (last) return last;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}
