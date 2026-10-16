import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "../../db";
import { cartItems, carts, productImages, products } from "../../db/schema";
import { AppError, notFound } from "@/lib/errors";
import { config } from "@/lib/config";

/** Returns the user's cart id, creating the cart on first use. */
async function ensureCart(userId: string, tx: Tx | typeof db = db) {
  const [cart] = await tx
    .insert(carts)
    .values({ userId })
    .onConflictDoUpdate({ target: carts.userId, set: { userId: sql`excluded.user_id` } })
    .returning({ id: carts.id });
  return cart.id;
}

/** Ids of the items in this user's cart that match `itemId` (scoping by user means nobody can touch another cart). */
const ownedItem = (userId: string, itemId: string) =>
  and(
    eq(cartItems.id, itemId),
    inArray(cartItems.cartId, db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId))),
  );

/** Shape the cart for the client. Prices come from the DB, so the client can never set them. */
export async function getCart(userId: string) {
  const cartId = await ensureCart(userId);

  const rows = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      product: {
        id: products.id,
        name: products.name,
        slug: products.slug,
        priceCents: products.priceCents,
        stock: products.stock,
        isActive: products.isActive,
      },
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt), asc(cartItems.id));

  const images = rows.length
    ? await db
        .selectDistinctOn([productImages.productId], {
          productId: productImages.productId,
          url: productImages.url,
          alt: productImages.alt,
        })
        .from(productImages)
        .where(inArray(productImages.productId, rows.map((r) => r.product.id)))
        .orderBy(productImages.productId, asc(productImages.position))
    : [];
  const imageByProduct = new Map(images.map(({ productId, ...img }) => [productId, img]));

  const items = rows.map((i) => ({
    id: i.id,
    quantity: i.quantity,
    unitPriceCents: i.product.priceCents,
    lineTotalCents: i.product.priceCents * i.quantity,
    // Lets the UI warn before checkout if something sold out or was delisted since it was added.
    available: i.product.isActive && i.product.stock >= i.quantity,
    product: {
      id: i.product.id,
      name: i.product.name,
      slug: i.product.slug,
      stock: i.product.stock,
      image: imageByProduct.get(i.product.id) ?? null,
    },
  }));
  return {
    id: cartId,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotalCents: items.reduce((sum, i) => sum + i.lineTotalCents, 0),
    currency: config.currency,
  };
}

export async function addItem(userId: string, productId: string, quantity: number) {
  await db.transaction(async (tx) => {
    const [product] = await tx
      .select({ isActive: products.isActive, stock: products.stock, name: products.name })
      .from(products)
      .where(eq(products.id, productId));
    if (!product || !product.isActive) throw notFound("Product");

    const cartId = await ensureCart(userId, tx);
    const [existing] = await tx
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)));

    const newQty = (existing?.quantity ?? 0) + quantity;
    if (newQty > config.maxQtyPerItem) {
      throw new AppError(400, "QUANTITY_LIMIT", `You can add at most ${config.maxQtyPerItem} of one item`);
    }
    if (newQty > product.stock) {
      throw new AppError(409, "INSUFFICIENT_STOCK", `Only ${product.stock} of "${product.name}" left in stock`, {
        available: product.stock,
      });
    }

    await tx
      .insert(cartItems)
      .values({ cartId, productId, quantity: newQty })
      .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.productId], set: { quantity: newQty, updatedAt: new Date() } });
  });
  return getCart(userId);
}

export async function updateItemQuantity(userId: string, itemId: string, quantity: number) {
  const [item] = await db
    .select({ stock: products.stock, isActive: products.isActive, name: products.name })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(ownedItem(userId, itemId));
  if (!item) throw notFound("Cart item");
  if (!item.isActive) throw new AppError(409, "PRODUCT_UNAVAILABLE", `"${item.name}" is no longer available`);
  if (quantity > item.stock) {
    throw new AppError(409, "INSUFFICIENT_STOCK", `Only ${item.stock} of "${item.name}" left in stock`, {
      available: item.stock,
    });
  }
  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId));
  return getCart(userId);
}

export async function removeItem(userId: string, itemId: string) {
  const deleted = await db.delete(cartItems).where(ownedItem(userId, itemId)).returning({ id: cartItems.id });
  if (deleted.length === 0) throw notFound("Cart item");
  return getCart(userId);
}

export async function clearCart(userId: string) {
  await db
    .delete(cartItems)
    .where(inArray(cartItems.cartId, db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId))));
  return getCart(userId);
}
