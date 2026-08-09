import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { GET as reviewsGet, POST as reviewsPost, DELETE as reviewsDelete } from "@/app/api/products/[id]/reviews/route";
import { prisma } from "@/lib/prisma";
import { __resetRateLimitStoreForTests } from "@/lib/rate-limit";
import {
  createTestProduct,
  createTestCustomer,
  customerAuthHeaders,
  deleteTestProduct,
  deleteOrdersByEmail,
  getRequest,
  jsonRequest,
  uniq,
  VALID_ADDRESS,
} from "../helpers";

const url = (id: number) => `http://localhost/api/products/${id}/reviews`;
const routeParams = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

describe("/api/products/[id]/reviews", () => {
  let productId: number | undefined;
  const customerIds: number[] = [];

  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  afterEach(async () => {
    if (productId) {
      await prisma.review.deleteMany({ where: { productId } });
      await deleteTestProduct(productId);
    }
    if (customerIds.length) {
      await prisma.review.deleteMany({ where: { customerId: { in: customerIds } } });
      await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
      customerIds.length = 0;
    }
    productId = undefined;
  });

  it("rejects an unauthenticated review", async () => {
    const { product } = await createTestProduct();
    productId = product.id;

    const res = await reviewsPost(jsonRequest(url(product.id), { rating: 5 }), routeParams(product.id));
    expect(res.status).toBe(401);
  });

  it("rejects an out-of-range or non-integer rating", async () => {
    const { product } = await createTestProduct();
    productId = product.id;
    const customer = await createTestCustomer();
    customerIds.push(customer.id);
    const headers = await customerAuthHeaders(customer.id, customer.email);

    for (const rating of [0, 6, 2.5, "five"]) {
      const res = await reviewsPost(jsonRequest(url(product.id), { rating }, { headers }), routeParams(product.id));
      expect(res.status).toBe(400);
    }
  });

  it("creates a review and updates the product's denormalized rating/count", async () => {
    const { product } = await createTestProduct();
    productId = product.id;
    const customer = await createTestCustomer();
    customerIds.push(customer.id);
    const headers = await customerAuthHeaders(customer.id, customer.email);

    const res = await reviewsPost(
      jsonRequest(url(product.id), { rating: 4, title: "Solid", body: "Wears well." }, { headers }),
      routeParams(product.id),
    );
    expect(res.status).toBe(201);

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.reviews).toBe(1);
    expect(updated.rating).toBe("4.0");
  });

  it("averages multiple reviews into the product rating", async () => {
    const { product } = await createTestProduct();
    productId = product.id;

    for (const rating of [5, 4, 3]) {
      const customer = await createTestCustomer();
      customerIds.push(customer.id);
      const headers = await customerAuthHeaders(customer.id, customer.email);
      const res = await reviewsPost(jsonRequest(url(product.id), { rating }, { headers }), routeParams(product.id));
      expect(res.status).toBe(201);
    }

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.reviews).toBe(3);
    expect(updated.rating).toBe("4.0"); // (5+4+3)/3
  });

  it("upserts rather than duplicating when the same customer reviews twice", async () => {
    const { product } = await createTestProduct();
    productId = product.id;
    const customer = await createTestCustomer();
    customerIds.push(customer.id);
    const headers = await customerAuthHeaders(customer.id, customer.email);

    await reviewsPost(jsonRequest(url(product.id), { rating: 2 }, { headers }), routeParams(product.id));
    await reviewsPost(
      jsonRequest(url(product.id), { rating: 5, title: "Changed my mind" }, { headers }),
      routeParams(product.id),
    );

    const rows = await prisma.review.findMany({ where: { productId: product.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].rating).toBe(5);
    expect(rows[0].title).toBe("Changed my mind");

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.reviews).toBe(1);
    expect(updated.rating).toBe("5.0");
  });

  it("marks a review as verified only when the customer actually ordered the product", async () => {
    const { product, variant } = await createTestProduct({ stock: 5 });
    productId = product.id;

    const unverified = await createTestCustomer();
    customerIds.push(unverified.id);
    const unverifiedHeaders = await customerAuthHeaders(unverified.id, unverified.email);
    const resA = await reviewsPost(
      jsonRequest(url(product.id), { rating: 4 }, { headers: unverifiedHeaders }),
      routeParams(product.id),
    );
    expect((await resA.json()).verified).toBe(false);

    const buyer = await createTestCustomer();
    customerIds.push(buyer.id);
    await prisma.order.create({
      data: {
        orderNumber: uniq("GB-TEST"),
        email: buyer.email,
        name: "Test Shopper",
        // Order stores addressLine1/2; VALID_ADDRESS uses the checkout
        // API's line1/line2 naming, so map rather than spread.
        addressLine1: VALID_ADDRESS.line1,
        addressLine2: VALID_ADDRESS.line2,
        city: VALID_ADDRESS.city,
        region: VALID_ADDRESS.region,
        postalCode: VALID_ADDRESS.postalCode,
        country: VALID_ADDRESS.country,
        phone: VALID_ADDRESS.phone,
        subtotal: 40,
        shipping: 8,
        tax: 2.8,
        total: 50.8,
        customerId: buyer.id,
        items: {
          create: [
            {
              productId: product.id,
              name: product.name,
              sku: product.sku,
              size: variant.size,
              color: variant.color,
              qty: 1,
              unitPrice: 40,
            },
          ],
        },
      },
    });
    const buyerHeaders = await customerAuthHeaders(buyer.id, buyer.email);
    const resB = await reviewsPost(
      jsonRequest(url(product.id), { rating: 5 }, { headers: buyerHeaders }),
      routeParams(product.id),
    );
    expect((await resB.json()).verified).toBe(true);

    await deleteOrdersByEmail(buyer.email);
  });

  it("lets a customer delete only their own review, and recomputes aggregates", async () => {
    const { product } = await createTestProduct();
    productId = product.id;

    const a = await createTestCustomer();
    const bCustomer = await createTestCustomer();
    customerIds.push(a.id, bCustomer.id);
    const aHeaders = await customerAuthHeaders(a.id, a.email);
    const bHeaders = await customerAuthHeaders(bCustomer.id, bCustomer.email);

    await reviewsPost(jsonRequest(url(product.id), { rating: 1 }, { headers: aHeaders }), routeParams(product.id));
    await reviewsPost(jsonRequest(url(product.id), { rating: 5 }, { headers: bHeaders }), routeParams(product.id));

    // A deletes — only A's row goes, B's survives.
    const del = await reviewsDelete(
      jsonRequest(url(product.id), {}, { method: "DELETE", headers: aHeaders }),
      routeParams(product.id),
    );
    expect(del.status).toBe(200);

    const rows = await prisma.review.findMany({ where: { productId: product.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].customerId).toBe(bCustomer.id);

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.reviews).toBe(1);
    expect(updated.rating).toBe("5.0");
  });

  it("lists reviews publicly and flags the caller's own review via `mine`", async () => {
    const { product } = await createTestProduct();
    productId = product.id;
    const customer = await createTestCustomer();
    customerIds.push(customer.id);
    const headers = await customerAuthHeaders(customer.id, customer.email);

    await reviewsPost(
      jsonRequest(url(product.id), { rating: 5, title: "Great" }, { headers }),
      routeParams(product.id),
    );

    const anon = await reviewsGet(getRequest(url(product.id)), routeParams(product.id));
    expect(anon.status).toBe(200);
    const anonData = await anon.json();
    expect(anonData.reviews).toHaveLength(1);
    expect(anonData.reviews[0].author).toBe("Test Shopper");
    expect(anonData.reviews[0].mine).toBe(false);

    const authed = await reviewsGet(getRequest(url(product.id), { headers }), routeParams(product.id));
    expect((await authed.json()).reviews[0].mine).toBe(true);
  });

  it("returns a rating distribution and average alongside the reviews", async () => {
    const { product } = await createTestProduct();
    productId = product.id;

    for (const rating of [5, 5, 3]) {
      const customer = await createTestCustomer();
      customerIds.push(customer.id);
      const headers = await customerAuthHeaders(customer.id, customer.email);
      await reviewsPost(jsonRequest(url(product.id), { rating }, { headers }), routeParams(product.id));
    }

    const data = await (await reviewsGet(getRequest(url(product.id)), routeParams(product.id))).json();
    expect(data.total).toBe(3);
    expect(data.average).toBeCloseTo(4.3, 1); // (5+5+3)/3 = 4.33
    expect(data.distribution).toMatchObject({ 5: 2, 4: 0, 3: 1, 2: 0, 1: 0 });
  });

  it("404s for an unknown product", async () => {
    const customer = await createTestCustomer();
    customerIds.push(customer.id);
    const headers = await customerAuthHeaders(customer.id, customer.email);

    const res = await reviewsPost(jsonRequest(url(99999999), { rating: 5 }, { headers }), routeParams(99999999));
    expect(res.status).toBe(404);
  });
});
