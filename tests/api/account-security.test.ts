import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { POST as signupPost } from "@/app/api/account/signup/route";
import { POST as forgotPasswordPost } from "@/app/api/account/forgot-password/route";
import { POST as resetPasswordPost } from "@/app/api/account/reset-password/route";
import { prisma } from "@/lib/prisma";
import { __resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { jsonRequest, uniq } from "../helpers";

const SIGNUP_URL = "http://localhost/api/account/signup";
const FORGOT_PASSWORD_URL = "http://localhost/api/account/forgot-password";
const RESET_PASSWORD_URL = "http://localhost/api/account/reset-password";

describe("signup rate limiting (/api/account/signup)", () => {
  const ip = "203.0.113.10";
  const createdEmails: string[] = [];

  beforeEach(async () => {
    __resetRateLimitStoreForTests();
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { email: { in: createdEmails } } });
  });

  it("rate-limits repeated signups from the same IP regardless of email", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 8; i++) {
      const email = `${uniq("signup")}@example.com`;
      createdEmails.push(email);
      const res = await signupPost(
        jsonRequest(
          SIGNUP_URL,
          { name: "Test Buyer", email, password: "correct-horse-battery-staple" },
          { headers: { "x-forwarded-for": ip } },
        ),
      );
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(201);

    const email = `${uniq("signup")}@example.com`;
    const res = await signupPost(
      jsonRequest(
        SIGNUP_URL,
        { name: "Test Buyer", email, password: "correct-horse-battery-staple" },
        { headers: { "x-forwarded-for": ip } },
      ),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("forgot-password rate limiting (/api/account/forgot-password)", () => {
  const email = `${uniq("forgot")}@example.com`;

  beforeEach(async () => {
    __resetRateLimitStoreForTests();
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { email } });
  });

  it("always returns the generic response for an unknown email (no enumeration)", async () => {
    const res = await forgotPasswordPost(jsonRequest(FORGOT_PASSWORD_URL, { email: "nobody@example.com" }));
    expect(res.status).toBe(200);
  });

  it("rate-limits repeated requests for the same email", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await forgotPasswordPost(
        jsonRequest(FORGOT_PASSWORD_URL, { email }, { headers: { "x-forwarded-for": `198.51.100.${i}` } }),
      );
      expect(res.status).toBe(200);
    }
    const fourth = await forgotPasswordPost(
      jsonRequest(FORGOT_PASSWORD_URL, { email }, { headers: { "x-forwarded-for": "198.51.100.99" } }),
    );
    expect(fourth.status).toBe(429);
    expect(fourth.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("reset-password rate limiting (/api/account/reset-password)", () => {
  const ip = "203.0.113.20";

  beforeEach(async () => {
    __resetRateLimitStoreForTests();
  });

  it("rate-limits repeated attempts from the same IP", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 10; i++) {
      const res = await resetPasswordPost(
        jsonRequest(
          RESET_PASSWORD_URL,
          { token: "not-a-real-token", password: "correct-horse-battery-staple" },
          { headers: { "x-forwarded-for": ip } },
        ),
      );
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(400); // invalid token, still under the limit

    const eleventh = await resetPasswordPost(
      jsonRequest(
        RESET_PASSWORD_URL,
        { token: "not-a-real-token", password: "correct-horse-battery-staple" },
        { headers: { "x-forwarded-for": ip } },
      ),
    );
    expect(eleventh.status).toBe(429);
  });
});
