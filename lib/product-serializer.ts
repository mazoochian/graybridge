import type { Product as DbProduct, ProductVariant as DbVariant } from "@/lib/generated/prisma/client";
import type { Product } from "@/lib/catalog";

export function serializeProduct(row: DbProduct & { variants?: DbVariant[] }): Product {
  return {
    id: row.id,
    name: row.name,
    cat: row.cat,
    price: row.price,
    wasPrice: row.wasPrice,
    imgId: row.imgId,
    colors: JSON.parse(row.colors),
    tags: JSON.parse(row.tags),
    rating: row.rating,
    reviews: row.reviews,
    stock: row.stock,
    sku: row.sku,
    desc: row.desc,
    variants: (row.variants ?? []).map((v) => ({ size: v.size, color: v.color, stock: v.stock })),
    _ord: row.ord,
    archived: row.archived,
  };
}
