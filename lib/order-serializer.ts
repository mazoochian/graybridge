import type { Order, OrderItem } from "@/lib/generated/prisma/client";

export function serializeOrder(row: Order & { items: OrderItem[] }) {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    name: row.name,
    email: row.email,
    itemCount: row.items.reduce((n, i) => n + i.qty, 0),
    total: row.total,
    status: row.status,
    paymentStatus: row.paymentStatus,
    carrier: row.carrier,
    trackingNumber: row.trackingNumber,
    discountCode: row.discountCode,
    discountAmount: row.discountAmount,
    createdAt: row.createdAt.toISOString(),
  };
}
