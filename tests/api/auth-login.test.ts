import { describe, it, expect, beforeEach, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { POST as adminLoginPost } from "@/app/api/auth/login/route";
import { POST as customerLoginPost } from "@/app/api/account/login/route";
import { prisma } from "@/lib/prisma";
import { __resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { jsonRequest, uniq } from "../helpers";

const ADMIN_URL = "http://localhost/api/auth/login";
const CUSTOMER_URL = "http://localhost/api/account/login";

describe("admin login (/api/auth/login)", () => {
  const username = uniq("admin");
  const password = "correct-horse-battery-staple";

  beforeEach(async () => {
    __resetRateLimitStoreForTests();
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({ where: { username } });
  });

  it("creates the fixture admin and logs in with the right password", async () => {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.create({ data: { username, passwordHash, role: "owner" } });

    const res = await adminLoginPost(jsonRequest(ADMIN_URL, { username, password }));
    expect(res.status).toBe(200);
    expect(res.cookies.get("gb_session")).toBeTruthy();
  });

  it("rejects the wrong password", async () => {
    const res = await adminLoginPost(jsonRequest(ADMIN_URL, { username, password: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("rate-limits repeated failed attempts against the same username (brute-force guard)", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 5; i++) {
      const res = await adminLoginPost(jsonRequest(ADMIN_URL, { username, password: "wrong" }));
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(401); // 5 wrong attempts still just "invalid credentials"

    const sixth = await adminLoginPost(jsonRequest(ADMIN_URL, { username, password: "wrong" }));
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get("Retry-After")).toBeTruthy();

    // Even the *correct* password is blocked while rate-limited.
    const seventh = await adminLoginPost(jsonRequest(ADMIN_URL, { username, password }));
    expect(seventh.status).toBe(429);
  });

  it("rate-limits by source IP across different usernames", async () => {
    const ip = "203.0.113.55";
    let lastStatus = 0;
    for (let i = 0; i < 20; i++) {
      const res = await adminLoginPost(
        jsonRequest(ADMIN_URL, { username: uniq("nouser"), password: "wrong" }, { headers: { "x-forwarded-for": ip } }),
      );
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(401);

    const res = await adminLoginPost(
      jsonRequest(ADMIN_URL, { username: uniq("nouser"), password: "wrong" }, { headers: { "x-forwarded-for": ip } }),
    );
    expect(res.status).toBe(429);
  });
});

describe("customer login (/api/account/login)", () => {
  const email = `${uniq("cust")}@example.com`;
  const password = "correct-horse-battery-staple";

  beforeEach(async () => {
    __resetRateLimitStoreForTests();
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { email } });
  });

  it("creates the fixture customer and logs in with the right password", async () => {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.customer.create({ data: { name: "Test Buyer", email, passwordHash } });

    const res = await customerLoginPost(jsonRequest(CUSTOMER_URL, { email, password }));
    expect(res.status).toBe(200);
    expect(res.cookies.get("gb_customer")).toBeTruthy();
  });

  it("rejects the wrong password", async () => {
    const res = await customerLoginPost(jsonRequest(CUSTOMER_URL, { email, password: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("rate-limits repeated failed attempts against the same account", async () => {
    for (let i = 0; i < 5; i++) {
      await customerLoginPost(jsonRequest(CUSTOMER_URL, { email, password: "wrong" }));
    }
    const sixth = await customerLoginPost(jsonRequest(CUSTOMER_URL, { email, password: "wrong" }));
    expect(sixth.status).toBe(429);
  });
});
