import { and, asc, count, desc, eq, getTableColumns, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { categories, productImages, products } from "../../db/schema";
import { notFound } from "@/lib/errors";
import type { CreateProductInput, ProductQuery } from "@/lib/validators";

const orderByMap: Record<ProductQuery["sort"], SQL> = {
  newest: desc(products.createdAt),
  price_asc: asc(products.priceCents),
  price_desc: desc(products.priceCents),
  name: asc(products.name),
};

const categoryColumns = { id: categories.id, name: categories.name, slug: categories.slug };

/** Escape LIKE wildcards so user input is matched literally. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listProducts(query: ProductQuery) {
  const { q, category, minPrice, maxPrice, sort, page, pageSize } = query;

  const conditions: (SQL | undefined)[] = [eq(products.isActive, true)];
  if (category) conditions.push(eq(categories.slug, category));
  if (minPrice !== undefined) conditions.push(gte(products.priceCents, minPrice));
  if (maxPrice !== undefined) conditions.push(lte(products.priceCents, maxPrice));
  if (q) {
    const pattern = `%${likeEscape(q)}%`;
    conditions.push(
      or(
        ilike(products.name, pattern),
        ilike(products.description, pattern),
        sql`lower(${products.sku}) = lower(${q})`,
      ),
    );
  }
  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ ...getTableColumns(products), category: categoryColumns })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(orderByMap[sort], asc(products.id)) // id tiebreaker keeps pagination stable
      .offset((page - 1) * pageSize)
      .limit(pageSize),
    db
      .select({ total: count() })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(where),
  ]);

  // First image per product (the card thumbnail)
  const images = rows.length
    ? await db
        .selectDistinctOn([productImages.productId], {
          productId: productImages.productId,
          url: productImages.url,
          alt: productImages.alt,
        })
        .from(productImages)
        .where(inArray(productImages.productId, rows.map((r) => r.id)))
        .orderBy(productImages.productId, asc(productImages.position))
    : [];
  const imageByProduct = new Map(images.map(({ productId, ...img }) => [productId, img]));

  const items = rows.map((r) => {
    const img = imageByProduct.get(r.id);
    return { ...r, images: img ? [img] : [] };
  });

  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProduct(idOrSlug: string) {
  const [product] = await db
    .select({ ...getTableColumns(products), category: categoryColumns })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.isActive, true), or(eq(products.id, idOrSlug), eq(products.slug, idOrSlug))))
    .limit(1);
  if (!product) throw notFound("Product");

  const images = await db
    .select({ id: productImages.id, url: productImages.url, alt: productImages.alt, position: productImages.position })
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(asc(productImages.position));

  return { ...product, images };
}

export function listCategories() {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug, description: categories.description })
    .from(categories)
    .orderBy(asc(categories.name));
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);

export async function createProduct(input: CreateProductInput) {
  const { images, slug, ...rest } = input;
  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({ ...rest, slug: slug ?? (slugify(input.name) || `product-${Date.now()}`) })
      .returning();
    const created = images.length
      ? await tx
          .insert(productImages)
          .values(images.map((img, position) => ({ ...img, productId: product.id, position })))
          .returning()
      : [];
    return { ...product, images: created };
  });
}
