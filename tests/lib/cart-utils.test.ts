import { describe, it, expect } from "vitest";
import { cartTotals, applyDiscount } from "@/lib/cart-utils";
import type { Product } from "@/lib/catalog";
import type { CartItem } from "@/lib/store";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Test Tee",
    cat: "tops",
    price: 40,
    wasPrice: null,
    imgId: "x",
    colors: ["Black"],
    tags: [],
    rating: "5",
    reviews: 0,
    stock: 10,
    sku: "SKU-1",
    desc: "",
    variants: [{ size: "M", color: "Black", stock: 10 }],
    _ord: 0,
    archived: false,
    ...overrides,
  };
}

function item(overrides: Partial<CartItem> = {}): CartItem {
  return { key: "1_M", id: 1, size: "M", color: "Black", qty: 1, ...overrides };
}

describe("cartTotals", () => {
  it("applies flat $8 shipping and 7% tax under the free-shipping threshold", () => {
    const totals = cartTotals([item({ qty: 1 })], [product({ price: 40 })]);
    expect(totals.subtotal).toBe(40);
    expect(totals.ship).toBe(8);
    expect(totals.tax).toBe(2.8); // 40 * 0.07
    expect(totals.total).toBe(50.8);
  });

  it("gives free shipping at $75+ subtotal", () => {
    const totals = cartTotals([item({ qty: 2 })], [product({ price: 40 })]);
    expect(totals.subtotal).toBe(80);
    expect(totals.ship).toBe(0);
    expect(totals.tax).toBe(5.6);
    expect(totals.total).toBe(85.6);
  });

  it("gives free shipping exactly at $75", () => {
    const totals = cartTotals([item({ qty: 1 })], [product({ price: 75 })]);
    expect(totals.ship).toBe(0);
  });

  it("treats an empty cart as zero everything", () => {
    const totals = cartTotals([], [product()]);
    expect(totals.subtotal).toBe(0);
    expect(totals.ship).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("ignores cart lines whose product can't be found", () => {
    const totals = cartTotals([item({ id: 999, qty: 1 })], [product({ id: 1 })]);
    expect(totals.subtotal).toBe(0);
  });
});

describe("applyDiscount", () => {
  // `subtotal` on the returned object is deliberately left as the
  // pre-discount line-item value (the checkout UI shows Subtotal, then a
  // separate Discount deduction line) — only ship/tax/total are computed
  // off the discounted amount.
  it("recomputes shipping and tax off the discounted subtotal", () => {
    const base = cartTotals([item({ qty: 2 })], [product({ price: 40 })]); // subtotal 80, free ship
    const discounted = applyDiscount(base, 10); // discounted amount now 70, drops below free-ship threshold
    expect(discounted.subtotal).toBe(80);
    expect(discounted.discountAmount).toBe(10);
    expect(discounted.ship).toBe(8);
    expect(discounted.tax).toBe(4.9); // 70 * 0.07
    expect(discounted.total).toBe(82.9); // 70 + 8 + 4.9
  });

  it("never lets the discounted amount go negative even if the code exceeds the subtotal", () => {
    const base = cartTotals([item({ qty: 1 })], [product({ price: 10 })]);
    const discounted = applyDiscount(base, 999);
    expect(discounted.ship).toBe(0);
    expect(discounted.tax).toBe(0);
    expect(discounted.total).toBe(0);
  });
});
