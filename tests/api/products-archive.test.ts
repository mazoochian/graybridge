import { describe, it, expect, afterEach } from "vitest";
import { GET as productsGet } from "@/app/api/products/route";
import { DELETE as productDelete, PATCH as productPatch } from "@/app/api/products/[id]/route";
import { createTestProduct, deleteTestProduct, getRequest, jsonRequest, adminAuthHeaders } from "../helpers";

const LIST_URL = "http://localhost/api/products";

describe("product soft delete (archive)", () => {
  let productId: number | undefined;

  afterEach(async () => {
    if (productId) await deleteTestProduct(productId);
    productId = undefined;
  });

  it("hides archived products from public (unauthenticated) listing but keeps them for admins", async () => {
    const { product } = await createTestProduct();
    productId = product.id;

    const authHeaders = await adminAuthHeaders("archive-tester");
    const archiveRes = await productDelete(getRequest(`http://localhost/api/products/${product.id}`, { headers: authHeaders }), {
      params: Promise.resolve({ id: String(product.id) }),
    });
    expect(archiveRes.status).toBe(200);
    const archived = await archiveRes.json();
    expect(archived.archived).toBe(true);

    const publicList = await (await productsGet(getRequest(LIST_URL))).json();
    expect(publicList.find((p: any) => p.id === product.id)).toBeUndefined();

    const adminList = await (await productsGet(getRequest(LIST_URL, { headers: authHeaders }))).json();
    const found = adminList.find((p: any) => p.id === product.id);
    expect(found).toBeTruthy();
    expect(found.archived).toBe(true);
  });

  it("requires auth to archive a product", async () => {
    const { product } = await createTestProduct();
    productId = product.id;

    const res = await productDelete(getRequest(`http://localhost/api/products/${product.id}`), {
      params: Promise.resolve({ id: String(product.id) }),
    });
    expect(res.status).toBe(401);
  });

  it("can be restored via PATCH { archived: false }", async () => {
    const { product } = await createTestProduct();
    productId = product.id;
    const authHeaders = await adminAuthHeaders("archive-tester-2");

    await productDelete(getRequest(`http://localhost/api/products/${product.id}`, { headers: authHeaders }), {
      params: Promise.resolve({ id: String(product.id) }),
    });

    const restoreRes = await productPatch(
      jsonRequest(`http://localhost/api/products/${product.id}`, { archived: false }, { method: "PATCH", headers: authHeaders }),
      { params: Promise.resolve({ id: String(product.id) }) },
    );
    expect(restoreRes.status).toBe(200);
    const restored = await restoreRes.json();
    expect(restored.archived).toBe(false);

    const publicList = await (await productsGet(getRequest(LIST_URL))).json();
    expect(publicList.find((p: any) => p.id === product.id)).toBeTruthy();
  });

  it("archiving a product does not delete its row (order history stays intact)", async () => {
    const { product } = await createTestProduct();
    productId = product.id;
    const authHeaders = await adminAuthHeaders("archive-tester-3");

    await productDelete(getRequest(`http://localhost/api/products/${product.id}`, { headers: authHeaders }), {
      params: Promise.resolve({ id: String(product.id) }),
    });

    // GET by id (used for admin edit / order line lookups) still resolves.
    const { GET: productGetById } = await import("@/app/api/products/[id]/route");
    const res = await productGetById(getRequest(`http://localhost/api/products/${product.id}`), {
      params: Promise.resolve({ id: String(product.id) }),
    });
    expect(res.status).toBe(200);
    const row = await res.json();
    expect(row.archived).toBe(true);
  });
});
