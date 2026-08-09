import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { GET as reviewsGet, POST as reviewsPost } from "@/app/api/products/[id]/reviews/route";
import { POST as helpfulPost } from "@/app/api/reviews/[id]/helpful/route";
import { prisma } from "@/lib/prisma";
import { __resetRateLimitStoreForTests } from "@/lib/rate-limit";
import {
  createTestProduct,
  createTestCustomer,
  customerAuthHeaders,
  deleteTestProduct,
  getRequest,
  jsonRequest,
} from "../helpers";

const productUrl = (id: number) => `http://localhost/api/products/${id}/reviews`;
const voteUrl = (id: number) => `http://localhost/api/reviews/${id}/helpful`;
const productParams = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const reviewParams = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

describe("/api/reviews/[id]/helpful", () => {
  let productId: number | undefined;
  const customerIds: number[] = [];

  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  afterEach(async () => {
    if (productId) {
      await prisma.reviewVote.deleteMany({ where: { review: { productId } } });
      await prisma.review.deleteMany({ where: { productId } });
      await deleteTestProduct(productId);
    }
    if (customerIds.length) {
      await prisma.reviewVote.deleteMany({ where: { customerId: { in: customerIds } } });
      await prisma.review.deleteMany({ where: { customerId: { in: customerIds } } });
      await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
      customerIds.length = 0;
    }
    productId = undefined;
  });

  /** Creates a product with one review by a fresh customer; returns the review id and a second customer's headers. */
  async function setup() {
    const { product } = await createTestProduct();
    productId = product.id;

    const author = await createTestCustomer();
    customerIds.push(author.id);
    const authorHeaders = await customerAuthHeaders(author.id, author.email);
    await reviewsPost(jsonRequest(productUrl(product.id), { rating: 5 }, { headers: authorHeaders }), productParams(product.id));
    const review = await prisma.review.findFirstOrThrow({ where: { productId: product.id } });

    const voter = await createTestCustomer();
    customerIds.push(voter.id);
    const voterHeaders = await customerAuthHeaders(voter.id, voter.email);

    return { product, review, authorHeaders, voterHeaders };
  }

  it("requires a signed-in customer", async () => {
    const { review } = await setup();
    const res = await helpfulPost(jsonRequest(voteUrl(review.id), {}), reviewParams(review.id));
    expect(res.status).toBe(401);
  });

  it("toggles a vote on and back off, keeping the stored count in sync", async () => {
    const { review, voterHeaders } = await setup();

    const on = await helpfulPost(jsonRequest(voteUrl(review.id), {}, { headers: voterHeaders }), reviewParams(review.id));
    expect(on.status).toBe(200);
    expect(await on.json()).toMatchObject({ helpful: 1, voted: true });
    expect((await prisma.review.findUniqueOrThrow({ where: { id: review.id } })).helpful).toBe(1);

    const off = await helpfulPost(jsonRequest(voteUrl(review.id), {}, { headers: voterHeaders }), reviewParams(review.id));
    expect(await off.json()).toMatchObject({ helpful: 0, voted: false });
    expect((await prisma.review.findUniqueOrThrow({ where: { id: review.id } })).helpful).toBe(0);
    expect(await prisma.reviewVote.count({ where: { reviewId: review.id } })).toBe(0);
  });

  it("counts one vote per customer even if the same customer votes repeatedly", async () => {
    const { review, voterHeaders } = await setup();

    // on, off, on — should end at exactly 1, never 3.
    for (let i = 0; i < 3; i++) {
      await helpfulPost(jsonRequest(voteUrl(review.id), {}, { headers: voterHeaders }), reviewParams(review.id));
    }
    expect((await prisma.review.findUniqueOrThrow({ where: { id: review.id } })).helpful).toBe(1);
    expect(await prisma.reviewVote.count({ where: { reviewId: review.id } })).toBe(1);
  });

  it("refuses a vote on your own review", async () => {
    const { review, authorHeaders } = await setup();
    const res = await helpfulPost(jsonRequest(voteUrl(review.id), {}, { headers: authorHeaders }), reviewParams(review.id));
    expect(res.status).toBe(400);
    expect((await prisma.review.findUniqueOrThrow({ where: { id: review.id } })).helpful).toBe(0);
  });

  it("404s on an unknown review", async () => {
    const { voterHeaders } = await setup();
    const res = await helpfulPost(jsonRequest(voteUrl(99999999), {}, { headers: voterHeaders }), reviewParams(99999999));
    expect(res.status).toBe(404);
  });

  it("exposes helpful count and the caller's own vote state on the public list", async () => {
    const { product, review, voterHeaders } = await setup();
    await helpfulPost(jsonRequest(voteUrl(review.id), {}, { headers: voterHeaders }), reviewParams(review.id));

    const anon = await (await reviewsGet(getRequest(productUrl(product.id)), productParams(product.id))).json();
    expect(anon.reviews[0].helpful).toBe(1);
    expect(anon.reviews[0].votedByMe).toBe(false);

    const asVoter = await (
      await reviewsGet(getRequest(productUrl(product.id), { headers: voterHeaders }), productParams(product.id))
    ).json();
    expect(asVoter.reviews[0].votedByMe).toBe(true);
  });

  it("sorts reviews most-helpful first", async () => {
    const { product } = await createTestProduct();
    productId = product.id;

    // Two reviews; the second one written gets a vote and should lead.
    const ids: number[] = [];
    for (const rating of [4, 2]) {
      const c = await createTestCustomer();
      customerIds.push(c.id);
      const h = await customerAuthHeaders(c.id, c.email);
      await reviewsPost(jsonRequest(productUrl(product.id), { rating }, { headers: h }), productParams(product.id));
    }
    const rows = await prisma.review.findMany({ where: { productId: product.id }, orderBy: { id: "asc" } });
    ids.push(...rows.map((r) => r.id));

    const voter = await createTestCustomer();
    customerIds.push(voter.id);
    const voterHeaders = await customerAuthHeaders(voter.id, voter.email);
    // Vote for the OLDER review, which would otherwise sort last by date.
    await helpfulPost(jsonRequest(voteUrl(ids[0]), {}, { headers: voterHeaders }), reviewParams(ids[0]));

    const data = await (await reviewsGet(getRequest(productUrl(product.id)), productParams(product.id))).json();
    expect(data.reviews[0].id).toBe(ids[0]);
    expect(data.reviews[0].helpful).toBe(1);
  });

  it("removes votes along with the review they belong to (cascade)", async () => {
    const { review, voterHeaders } = await setup();
    await helpfulPost(jsonRequest(voteUrl(review.id), {}, { headers: voterHeaders }), reviewParams(review.id));
    expect(await prisma.reviewVote.count({ where: { reviewId: review.id } })).toBe(1);

    await prisma.review.delete({ where: { id: review.id } });
    expect(await prisma.reviewVote.count({ where: { reviewId: review.id } })).toBe(0);
  });
});
