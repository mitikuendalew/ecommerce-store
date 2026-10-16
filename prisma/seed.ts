import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });

  const clothing = await prisma.category.upsert({
    where: { slug: "clothing" },
    update: {},
    create: { name: "Clothing", slug: "clothing" },
  });
  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: { name: "Electronics", slug: "electronics" },
  });

  const products = [
    { name: "Cotton T-Shirt", slug: "cotton-t-shirt", sku: "TSH-001", priceCents: 1999, stock: 50, categoryId: clothing.id },
    { name: "Wireless Earbuds", slug: "wireless-earbuds", sku: "EAR-001", priceCents: 5999, stock: 25, categoryId: electronics.id },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...p, description: `${p.name} — sample product for local development.` },
    });
  }
  console.log(`Seeded admin ${email}, 2 categories, ${products.length} products`);
}

main().finally(() => prisma.$disconnect());
