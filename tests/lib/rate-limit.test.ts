import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, __resetRateLimitStoreForTests } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  it("allows attempts up to the max within the window", () => {
    const key = "test-key-1";
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, { max: 5, windowMs: 60_000 });
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks the attempt after the max is reached", () => {
    const key = "test-key-2";
    for (let i = 0; i < 5; i++) checkRateLimit(key, { max: 5, windowMs: 60_000 });
    const sixth = checkRateLimit(key, { max: 5, windowMs: 60_000 });
    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const a = "key-a";
    const b = "key-b";
    for (let i = 0; i < 5; i++) checkRateLimit(a, { max: 5, windowMs: 60_000 });
    expect(checkRateLimit(a, { max: 5, windowMs: 60_000 }).allowed).toBe(false);
    expect(checkRateLimit(b, { max: 5, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("resets the count once the window has elapsed", () => {
    const key = "test-key-3";
    for (let i = 0; i < 5; i++) checkRateLimit(key, { max: 5, windowMs: 10 });
    expect(checkRateLimit(key, { max: 5, windowMs: 10 }).allowed).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit(key, { max: 5, windowMs: 10 }).allowed).toBe(true);
        resolve();
      }, 20);
    });
  });
});
