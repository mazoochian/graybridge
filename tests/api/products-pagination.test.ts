import { describe, it, expect, afterEach } from "vitest";
import { GET as productsGet } from "@/app/api/products/route";
import { createTestProduct, deleteTestProduct, getRequest } from "../helpers";

describe("GET /api/products pagination", () => {
  it("returns a bare array when no pagination params are given (legacy shape, unchanged)", async () => {
    const res = await productsGet(getRequest("http://localhost/api/products"));
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns a paginated envelope when page/pageSize are given", async () => {
    const res = await productsGet(getRequest("http://localhost/api/products?page=1&pageSize=5"));
    const body = await res.json();
    expect(Array.isArray(body)).toBe(false);
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeLessThanOrEqual(5);
    expect(typeof body.total).toBe("number");
    expect(typeof body.totalPages).toBe("number");
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(5);
  });

  it("paginated products still include their variants", async () => {
    const res = await productsGet(getRequest("http://localhost/api/products?page=1&pageSize=3"));
    const body = await res.json();
    for (const p of body.products) {
      expect(Array.isArray(p.variants)).toBe(true);
    }
  });

  describe("with an isolated test product", () => {
    let productId: number | undefined;

    afterEach(async () => {
      if (productId) await deleteTestProduct(productId);
      productId = undefined;
    });

    it("filters by category", async () => {
      const uniqueCat = `test-cat-${Date.now()}`;
      const { product } = await createTestProduct();
      productId = product.id;
      // createTestProduct always uses cat "test" — reuse it directly.
      const res = await productsGet(getRequest(`http://localhost/api/products?cat=test&page=1&pageSize=50`));
      const body = await res.json();
      expect(body.products.every((p: any) => p.cat === "test")).toBe(true);
      expect(body.products.some((p: any) => p.id === product.id)).toBe(true);
      void uniqueCat;
    });

    it("does not paginate away a product matching a text search", async () => {
      const { product } = await createTestProduct();
      productId = product.id;
      const res = await productsGet(
        getRequest(`http://localhost/api/products?q=${encodeURIComponent(product.name)}&page=1&pageSize=5`),
      );
      const body = await res.json();
      expect(body.products.some((p: any) => p.id === product.id)).toBe(true);
      expect(body.total).toBe(1);
    });

    it("excludes archived products from the paginated (public) response", async () => {
      const { product } = await createTestProduct();
      productId = product.id;
      const { prisma } = await import("@/lib/prisma");
      await prisma.product.update({ where: { id: product.id }, data: { archived: true } });

      const res = await productsGet(getRequest(`http://localhost/api/products?q=${encodeURIComponent(product.name)}&page=1&pageSize=5`));
      const body = await res.json();
      expect(body.total).toBe(0);
    });
  });
});
