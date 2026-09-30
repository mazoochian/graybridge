import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { POST as checkoutPost } from "@/app/api/checkout/route";
import { GET as discountsGet } from "@/app/api/discounts/route";
import { GET as validateGet } from "@/app/api/discounts/validate/route";
import { GET as ordersGet } from "@/app/api/orders/route";
import { POST as resetPasswordPost } from "@/app/api/account/reset-password/route";
import { GET as uploadGet } from "@/app/uploads/[file]/route";
import { prisma } from "@/lib/prisma";
import { __resetRateLimitStoreForTests, getClientIp } from "@/lib/rate-limit";
import { neutralizeFormula, parseCsv, toCsvRow } from "@/lib/csv";
import {
  adminAuthHeaders,
  createTestCustomer,
  createTestProduct,
  deleteOrdersByEmail,
  deleteTestProduct,
  getRequest,
  jsonRequest,
  uniq,
  VALID_ADDRESS,
} from "../helpers";

const CHECKOUT_URL = "http://localhost/api/checkout";

function checkoutBody(productId: number, size: string, color: string, email: string, discountCode?: string) {
  return { items: [{ id: productId, size, color, qty: 1 }], name: "Test Buyer", email, address: VALID_ADDRESS, discountCode };
}

describe("admin routes re-check the admin account on every request", () => {
  it("rejects a still-valid session token once the admin account has been removed", async () => {
    const username = uniq("gone-admin");
    const admin = await prisma.adminUser.create({ data: { username, passwordHash: "unused", role: "staff" } });
    const headers = await adminAuthHeaders(username);

    const before = await discountsGet(getRequest("http://localhost/api/discounts", { headers }));
    expect(before.status).toBe(200);

    await prisma.adminUser.delete({ where: { id: admin.id } });

    const after = await discountsGet(getRequest("http://localhost/api/discounts", { headers }));
    expect(after.status).toBe(401);
  });
});

describe("POST /api/checkout — archived products and discount limits", () => {
  let productId: number | undefined;
  const emails: string[] = [];
  let codeId: number | undefined;

  afterEach(async () => {
    for (const e of emails.splice(0)) await deleteOrdersByEmail(e);
    if (productId) await deleteTestProduct(productId);
    if (codeId) await prisma.discountCode.deleteMany({ where: { id: codeId } });
    productId = undefined;
    codeId = undefined;
  });

  it("refuses to sell an archived product and leaves its stock alone", async () => {
    const { product, variant } = await createTestProduct({ stock: 3 });
    productId = product.id;
    await prisma.product.update({ where: { id: product.id }, data: { archived: true } });
    const email = `${uniq("buyer")}@example.com`;
    emails.push(email);

    const res = await checkoutPost(jsonRequest(CHECKOUT_URL, checkoutBody(product.id, variant.size, variant.color, email)));
    expect(res.status).toBe(400);

    const unchanged = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(unchanged.stock).toBe(3);
  });

  it("never lets two concurrent checkouts both redeem the last use of a discount code", async () => {
    const { product, variant } = await createTestProduct({ stock: 10, price: 50 });
    productId = product.id;
    const code = uniq("LAST").toUpperCase();
    const created = await prisma.discountCode.create({ data: { code, type: "percent", value: 10, usageLimit: 1 } });
    codeId = created.id;
    const buyers = Array.from({ length: 6 }, () => `${uniq("buyer")}@example.com`);
    emails.push(...buyers);

    const results = await Promise.all(
      buyers.map((email) =>
        checkoutPost(jsonRequest(CHECKOUT_URL, checkoutBody(product.id, variant.size, variant.color, email, code))),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);

    const after = await prisma.discountCode.findUniqueOrThrow({ where: { id: created.id } });
    expect(after.usedCount).toBe(1);
    // Losing checkouts rolled back, so only one unit left stock.
    const v = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(v.stock).toBe(9);
  });
});

describe("GET /api/discounts/validate", () => {
  beforeEach(() => __resetRateLimitStoreForTests());

  it("rate-limits repeated guesses from one IP", async () => {
    const headers = { "x-forwarded-for": "198.51.100.77" };
    let last = 0;
    for (let i = 0; i < 30; i++) {
      last = (await validateGet(getRequest(`http://localhost/api/discounts/validate?code=${uniq("NOPE")}&subtotal=100`, { headers }))).status;
    }
    expect(last).toBe(200);
    const res = await validateGet(getRequest("http://localhost/api/discounts/validate?code=NOPE&subtotal=100", { headers }));
    expect(res.status).toBe(429);
  });
});

describe("GET /api/orders — 30-day stats", () => {
  it("computes revenue/orders/units in the database with the same results as before", async () => {
    const admin = await prisma.adminUser.create({ data: { username: uniq("stats"), passwordHash: "unused" } });
    const headers = await adminAuthHeaders(admin.username);
    const { product, variant } = await createTestProduct({ stock: 10, price: 30 });
    const email = `${uniq("stats-buyer")}@example.com`;
    try {
      const before = await (await ordersGet(getRequest("http://localhost/api/orders", { headers }))).json();
      const res = await checkoutPost(
        jsonRequest(CHECKOUT_URL, {
          items: [{ id: product.id, size: variant.size, color: variant.color, qty: 2 }],
          name: "Stats Buyer",
          email,
          address: VALID_ADDRESS,
        }),
      );
      expect(res.status).toBe(201);
      const after = await (await ordersGet(getRequest("http://localhost/api/orders", { headers }))).json();

      expect(after.stats.orders30d).toBe(before.stats.orders30d + 1);
      expect(after.stats.units30d).toBe(before.stats.units30d + 2);
      // $60 subtotal + $8 shipping + $4.20 tax
      expect(after.stats.revenue30d - before.stats.revenue30d).toBeCloseTo(72.2, 5);
    } finally {
      await deleteOrdersByEmail(email);
      await deleteTestProduct(product.id);
      await prisma.adminUser.delete({ where: { id: admin.id } });
    }
  });
});

describe("POST /api/account/reset-password — token reuse", () => {
  beforeEach(() => __resetRateLimitStoreForTests());

  it("lets only one of two concurrent submissions of the same link succeed", async () => {
    const customer = await createTestCustomer();
    const raw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    await prisma.passwordResetToken.create({
      data: { customerId: customer.id, tokenHash, expiresAt: new Date(Date.now() + 60_000) },
    });
    try {
      const url = "http://localhost/api/account/reset-password";
      const [a, b] = await Promise.all([
        resetPasswordPost(jsonRequest(url, { token: raw, password: "first-new-password" })),
        resetPasswordPost(jsonRequest(url, { token: raw, password: "second-new-password" })),
      ]);
      expect([a.status, b.status].sort()).toEqual([200, 400]);
    } finally {
      await prisma.passwordResetToken.deleteMany({ where: { customerId: customer.id } });
      await prisma.customer.delete({ where: { id: customer.id } });
    }
  });

  it("retires the customer's other outstanding reset links once one is used", async () => {
    const customer = await createTestCustomer();
    const mk = async () => {
      const raw = randomBytes(32).toString("hex");
      await prisma.passwordResetToken.create({
        data: {
          customerId: customer.id,
          tokenHash: createHash("sha256").update(raw).digest("hex"),
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      return raw;
    };
    const older = await mk();
    const newer = await mk();
    try {
      const url = "http://localhost/api/account/reset-password";
      expect((await resetPasswordPost(jsonRequest(url, { token: newer, password: "brand-new-password" }))).status).toBe(200);
      expect((await resetPasswordPost(jsonRequest(url, { token: older, password: "attacker-password" }))).status).toBe(400);
    } finally {
      await prisma.passwordResetToken.deleteMany({ where: { customerId: customer.id } });
      await prisma.customer.delete({ where: { id: customer.id } });
    }
  });
});

describe("getClientIp", () => {
  it("uses the proxy-appended (rightmost) X-Forwarded-For entry, falling back to X-Real-IP", () => {
    const req = (headers: Record<string, string>) => new Request("http://localhost/", { headers });
    expect(getClientIp(req({ "x-real-ip": "203.0.113.5" }))).toBe("203.0.113.5");
    // A client-supplied spoofed first entry must not become the rate-limit key.
    expect(getClientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(getClientIp(req({}))).toBe("unknown");
  });
});

describe("CSV helpers", () => {
  it("quotes fields containing a bare carriage return so rows round-trip", () => {
    const row = toCsvRow(["a\rb", "c"]);
    expect(parseCsv(row)).toEqual([["a\rb", "c"]]);
  });

  it("neutralizes formula-looking cells", () => {
    expect(neutralizeFormula("=HYPERLINK(\"http://x\")")).toBe("'=HYPERLINK(\"http://x\")");
    expect(neutralizeFormula("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(neutralizeFormula("Great tee")).toBe("Great tee");
  });
});

describe("GET /uploads/[file]", () => {
  it("rejects anything that isn't a generated upload name", async () => {
    for (const file of ["..%2F..%2Fpackage.json", "../../package.json", "x.svg", "abc.png"]) {
      const res = await uploadGet(getRequest(`http://localhost/uploads/${file}`), { params: Promise.resolve({ file }) });
      expect(res.status).toBe(404);
    }
  });
});
