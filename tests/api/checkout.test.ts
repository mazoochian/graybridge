import { describe, it, expect, afterEach } from "vitest";
import { POST as checkoutPost } from "@/app/api/checkout/route";
import { prisma } from "@/lib/prisma";
import { createTestProduct, deleteTestProduct, deleteOrdersByEmail, jsonRequest, uniq, VALID_ADDRESS } from "../helpers";

const URL = "http://localhost/api/checkout";

function checkoutBody(productId: number, size: string, color: string, qty: number, email: string) {
  return {
    items: [{ id: productId, size, color, qty }],
    name: "Test Buyer",
    email,
    address: VALID_ADDRESS,
  };
}

describe("POST /api/checkout — stock", () => {
  let productId: number | undefined;
  let email: string | undefined;

  afterEach(async () => {
    if (email) await deleteOrdersByEmail(email);
    if (productId) await deleteTestProduct(productId);
    productId = undefined;
    email = undefined;
  });

  it("decrements variant stock by the purchased quantity on a normal checkout", async () => {
    const { product, variant } = await createTestProduct({ stock: 5 });
    productId = product.id;
    email = `${uniq("buyer")}@example.com`;

    const res = await checkoutPost(jsonRequest(URL, checkoutBody(product.id, variant.size, variant.color, 2, email)));
    expect(res.status).toBe(201);

    const updated = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(updated.stock).toBe(3);
  });

  it("rejects a checkout that requests more than the available stock", async () => {
    const { product, variant } = await createTestProduct({ stock: 2 });
    productId = product.id;
    email = `${uniq("buyer")}@example.com`;

    const res = await checkoutPost(jsonRequest(URL, checkoutBody(product.id, variant.size, variant.color, 3, email)));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not enough stock/i);

    const unchanged = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(unchanged.stock).toBe(2);
  });

  it("never oversells a variant under two concurrent checkouts for the same last unit (race condition guard)", async () => {
    // Regression test for the oversell bug: the old code checked
    // `variant.stock < qty` and then did an unconditional `decrement` in
    // the same transaction, with no atomic guard between the two —
    // letting two concurrent requests both pass the check and both
    // decrement, driving stock negative. The fix uses `updateMany` with a
    // `stock: { gte: qty }` guard and aborts if the affected-row count is 0.
    const { product, variant } = await createTestProduct({ stock: 1 });
    productId = product.id;
    const emailA = `${uniq("buyer-a")}@example.com`;
    const emailB = `${uniq("buyer-b")}@example.com`;
    email = emailA; // afterEach cleans up by product id anyway; track one for order cleanup

    const [resA, resB] = await Promise.all([
      checkoutPost(jsonRequest(URL, checkoutBody(product.id, variant.size, variant.color, 1, emailA))),
      checkoutPost(jsonRequest(URL, checkoutBody(product.id, variant.size, variant.color, 1, emailB))),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 400]);

    const final = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(final.stock).toBe(0); // must never go negative

    await deleteOrdersByEmail(emailA);
    await deleteOrdersByEmail(emailB);
  });

  it("rejects an unknown product id", async () => {
    email = `${uniq("buyer")}@example.com`;
    const res = await checkoutPost(jsonRequest(URL, checkoutBody(999_999_999, "M", "Black", 1, email)));
    expect(res.status).toBe(400);
  });

  it("rejects a checkout with no items", async () => {
    email = `${uniq("buyer")}@example.com`;
    const res = await checkoutPost(jsonRequest(URL, { items: [], name: "X", email, address: VALID_ADDRESS }));
    expect(res.status).toBe(400);
  });
});
