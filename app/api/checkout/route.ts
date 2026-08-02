import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { applyDiscount, cartTotals } from "@/lib/cart-utils";
import { serializeProduct } from "@/lib/product-serializer";
import { chargeOrder } from "@/lib/payment";
import { sendOrderConfirmation } from "@/lib/mail";
import { getCustomerSessionFromRequest } from "@/lib/customer-auth";
import { validateDiscountCode } from "@/lib/discount";
import type { CartItem } from "@/lib/store";

interface CheckoutItem {
  id: number;
  size: string;
  color: string;
  qty: number;
}

const ORDER_NUMBER_BASE = 10600;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items: CheckoutItem[] = rawItems
    .map((i: unknown) => {
      const it = i as Record<string, unknown>;
      return {
        id: Number(it.id),
        size: typeof it.size === "string" ? it.size : "M",
        color: typeof it.color === "string" ? it.color : "",
        qty: Number(it.qty),
      };
    })
    .filter((i: CheckoutItem) => Number.isInteger(i.id) && Number.isInteger(i.qty) && i.qty > 0);

  const address = (body.address ?? {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const addressLine1 = typeof address.line1 === "string" ? address.line1.trim() : "";
  const addressLine2 = typeof address.line2 === "string" ? address.line2.trim() : "";
  const city = typeof address.city === "string" ? address.city.trim() : "";
  const region = typeof address.region === "string" ? address.region.trim() : "";
  const postalCode = typeof address.postalCode === "string" ? address.postalCode.trim() : "";
  const country = typeof address.country === "string" ? address.country.trim() : "";
  const phone = typeof address.phone === "string" ? address.phone.trim() : "";

  if (!items.length) return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
  if (!isNonEmptyString(name)) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (![addressLine1, city, region, postalCode, country].every(isNonEmptyString)) {
    return NextResponse.json({ error: "A complete shipping address is required." }, { status: 400 });
  }

  const customerSession = await getCustomerSessionFromRequest(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const ids = [...new Set(items.map((i) => i.id))];
      const productRows = await tx.product.findMany({ where: { id: { in: ids } }, include: { variants: true } });
      const products = productRows.map(serializeProduct);
      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const id of ids) {
        if (!productMap.has(id)) throw new Error(`Product ${id} not found.`);
      }

      const requestedById = new Map<number, number>();
      for (const item of items) requestedById.set(item.id, (requestedById.get(item.id) ?? 0) + item.qty);

      const variantKey = (id: number, size: string, color: string) => `${id}::${size}::${color}`;
      const requestedByVariant = new Map<string, { id: number; size: string; color: string; qty: number }>();
      for (const item of items) {
        const key = variantKey(item.id, item.size, item.color);
        const existing = requestedByVariant.get(key);
        requestedByVariant.set(key, { id: item.id, size: item.size, color: item.color, qty: (existing?.qty ?? 0) + item.qty });
      }

      for (const { id, size, color, qty } of requestedByVariant.values()) {
        const p = productMap.get(id)!;
        const variant = p.variants.find((v) => v.size === size && v.color === color);
        if (!variant) throw new Error(`"${p.name}" isn't available in ${color}, size ${size}.`);
        if (variant.stock < qty) {
          throw new Error(`Not enough stock for "${p.name}" (${color}, size ${size}) — ${variant.stock} left.`);
        }
      }

      const cartShaped: CartItem[] = items.map((i) => ({
        key: `${i.id}_${i.size}`,
        id: i.id,
        size: i.size,
        color: i.color,
        qty: i.qty,
      }));
      const baseTotals = cartTotals(cartShaped, products);
      const rawDiscountCode = typeof body.discountCode === "string" ? body.discountCode.trim() : "";
      let discountAmount = 0;
      let appliedCode = "";
      if (rawDiscountCode) {
        const validation = await validateDiscountCode(tx, rawDiscountCode, baseTotals.subtotal);
        if (!validation.valid) throw new Error(validation.message || "Invalid discount code.");
        discountAmount = validation.discountAmount;
        appliedCode = validation.normalizedCode;
      }
      const totals = discountAmount > 0 ? applyDiscount(baseTotals, discountAmount) : baseTotals;

      const charge = await chargeOrder(Math.round(totals.total * 100));
      if (!charge.ok) throw new Error("Payment failed.");

      const created = await tx.order.create({
        data: {
          orderNumber: `PENDING-${randomUUID()}`,
          email,
          name,
          addressLine1,
          addressLine2,
          city,
          region,
          postalCode,
          country,
          phone,
          subtotal: totals.subtotal,
          shipping: totals.ship,
          tax: totals.tax,
          total: totals.total,
          paymentStatus: "paid",
          paymentProvider: charge.provider,
          paymentRef: charge.ref,
          discountCode: appliedCode,
          discountAmount,
          customerId: customerSession?.customerId,
          items: {
            create: items.map((i) => {
              const p = productMap.get(i.id)!;
              return { productId: p.id, name: p.name, sku: p.sku, size: i.size, color: i.color, qty: i.qty, unitPrice: p.price };
            }),
          },
        },
        include: { items: true },
      });

      const orderNumber = `GB-${ORDER_NUMBER_BASE + created.id}`;
      const order = await tx.order.update({ where: { id: created.id }, data: { orderNumber }, include: { items: true } });

      for (const { id, size, color, qty } of requestedByVariant.values()) {
        await tx.productVariant.update({
          where: { productId_size_color: { productId: id, size, color } },
          data: { stock: { decrement: qty } },
        });
      }
      for (const [id, qty] of requestedById) {
        await tx.product.update({ where: { id }, data: { stock: { decrement: qty } } });
      }

      if (appliedCode) {
        await tx.discountCode.update({ where: { code: appliedCode }, data: { usedCount: { increment: 1 } } });
      }

      return { order, totals };
    });

    sendOrderConfirmation({
      orderNumber: result.order.orderNumber,
      email: result.order.email,
      name: result.order.name,
      items: result.order.items,
      subtotal: result.order.subtotal,
      shipping: result.order.shipping,
      tax: result.order.tax,
      total: result.order.total,
    }).catch((e) => console.error("[checkout] confirmation email failed:", e));

    return NextResponse.json(
      { orderNumber: result.order.orderNumber, id: result.order.id, totalStr: result.totals.totalStr },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
