import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";
import type { CreateProductInput, ProductQuery } from "@/lib/validators";

const orderByMap: Record<ProductQuery["sort"], Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  price_asc: { priceCents: "asc" },
  price_desc: { priceCents: "desc" },
  name: { name: "asc" },
};

export async function listProducts(query: ProductQuery) {
  const { q, category, minPrice, maxPrice, sort, page, pageSize } = query;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(category ? { category: { slug: category } } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? { priceCents: { gte: minPrice, lte: maxPrice } }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { sku: { equals: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: [orderByMap[sort], { id: "asc" }], // id tiebreaker keeps pagination stable
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProduct(idOrSlug: string) {
  const product = await prisma.product.findFirst({
    where: { isActive: true, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true, position: true } },
    },
  });
  if (!product) throw notFound("Product");
  return product;
}

export function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, description: true },
  });
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);

export async function createProduct(input: CreateProductInput) {
  const { images, slug, ...rest } = input;
  return prisma.product.create({
    data: {
      ...rest,
      slug: slug ?? (slugify(input.name) || `product-${Date.now()}`),
      images: { create: images.map((img, position) => ({ ...img, position })) },
    },
    include: { images: true },
  });
}
