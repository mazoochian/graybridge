import { img, type Product } from "@/lib/catalog";
import type { CartItem } from "@/lib/store";

export interface CartLine {
  key: string;
  id: number;
  name: string;
  meta: string;
  qty: number;
  img: string;
  lineStr: string;
}

export function cartLines(cart: CartItem[], catalog: Product[]): CartLine[] {
  return cart.map((c) => {
    const p = catalog.find((x) => x.id === c.id);
    const price = p ? p.price : 0;
    return {
      key: c.key,
      id: c.id,
      name: p ? p.name : "Item",
      meta: (p ? p.cat : "") + (c.color ? " · " + c.color : "") + " · Size " + c.size,
      qty: c.qty,
      img: img(p ? p.imgId : "", 200),
      lineStr: "$" + price * c.qty,
    };
  });
}

export function applyDiscount(totals: ReturnType<typeof cartTotals>, discountAmount: number) {
  const discountedSubtotal = Math.max(0, totals.subtotal - discountAmount);
  const ship = discountedSubtotal === 0 ? 0 : discountedSubtotal >= 75 ? 0 : 8;
  const tax = Math.round(discountedSubtotal * 0.07 * 100) / 100;
  const total = discountedSubtotal + ship + tax;
  return {
    ...totals,
    discountAmount,
    ship,
    tax,
    total,
    shipStr: ship === 0 ? (discountedSubtotal === 0 ? "$0.00" : "Free") : "$" + ship.toFixed(2),
    taxStr: "$" + tax.toFixed(2),
    totalStr: "$" + total.toFixed(2),
    discountAmountStr: "-$" + discountAmount.toFixed(2),
  };
}

export function cartTotals(cart: CartItem[], catalog: Product[]) {
  const subtotal = cart.reduce((n, c) => {
    const p = catalog.find((x) => x.id === c.id);
    return n + (p ? p.price * c.qty : 0);
  }, 0);
  const ship = subtotal === 0 ? 0 : subtotal >= 75 ? 0 : 8;
  const tax = Math.round(subtotal * 0.07 * 100) / 100;
  const total = subtotal + ship + tax;
  return {
    subtotal,
    ship,
    tax,
    total,
    subtotalStr: "$" + subtotal.toFixed(2),
    shipStr: ship === 0 ? (subtotal === 0 ? "$0.00" : "Free") : "$" + ship.toFixed(2),
    taxStr: "$" + tax.toFixed(2),
    totalStr: "$" + total.toFixed(2),
    freeShipNote:
      subtotal >= 75 || subtotal === 0
        ? "You qualify for free carbon-neutral shipping."
        : "Add $" + (75 - subtotal).toFixed(2) + " for free shipping.",
  };
}
