import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { archived: false },
    select: { id: true, updatedAt: true },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/shipping`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/returns`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/size-guide`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/product/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
