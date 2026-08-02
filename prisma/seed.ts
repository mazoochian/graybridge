import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildCatalog, distributeVariants } from "../lib/catalog";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedProducts() {
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(`Products already seeded (${existing} rows) — skipping.`);
    return;
  }
  const catalog = buildCatalog();
  await prisma.product.createMany({
    data: catalog.map((p) => ({
      name: p.name,
      cat: p.cat,
      price: p.price,
      wasPrice: p.wasPrice,
      imgId: p.imgId,
      colors: JSON.stringify(p.colors),
      tags: JSON.stringify(p.tags),
      rating: p.rating,
      reviews: p.reviews,
      stock: p.stock,
      sku: p.sku,
      desc: "",
      ord: p._ord,
    })),
  });
  console.log(`Seeded ${catalog.length} products.`);
}

async function seedVariants() {
  const existing = await prisma.productVariant.count();
  if (existing > 0) {
    console.log(`Variants already seeded (${existing} rows) — skipping.`);
    return;
  }
  const products = await prisma.product.findMany();
  let total = 0;
  for (const p of products) {
    const colors: string[] = JSON.parse(p.colors);
    const variants = distributeVariants(colors, p.stock);
    if (!variants.length) continue;
    await prisma.productVariant.createMany({
      data: variants.map((v) => ({ productId: p.id, size: v.size, color: v.color, stock: v.stock })),
    });
    total += variants.length;
  }
  console.log(`Seeded ${total} product variants across ${products.length} products.`);
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin user "${username}" already exists — skipping.`);
    return;
  }
  const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({ data: { username, passwordHash } });
  console.log("=".repeat(60));
  console.log("Admin account created — save these credentials now:");
  console.log(`  username: ${username}`);
  console.log(`  password: ${password}`);
  console.log("This password is not stored anywhere else and won't be shown again.");
  console.log("=".repeat(60));
}

async function main() {
  await seedProducts();
  await seedVariants();
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
