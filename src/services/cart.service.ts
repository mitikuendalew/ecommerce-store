import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError, notFound } from "@/lib/errors";
import { config } from "@/lib/config";

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          priceCents: true,
          stock: true,
          isActive: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

/** Shape the cart for the client. Prices come from the DB, so the client can never set them. */
function format(cart: CartWithItems) {
  const items = cart.items.map((i) => ({
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
      image: i.product.images[0] ?? null,
    },
  }));
  return {
    id: cart.id,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotalCents: items.reduce((sum, i) => sum + i.lineTotalCents, 0),
    currency: config.currency,
  };
}

export async function getCart(userId: string) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: cartInclude,
  });
  return format(cart);
}

export async function addItem(userId: string, productId: string, quantity: number) {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { isActive: true, stock: true, name: true },
    });
    if (!product || !product.isActive) throw notFound("Product");

    const cart = await tx.cart.upsert({ where: { userId }, create: { userId }, update: {} });
    const key = { cartId_productId: { cartId: cart.id, productId } };
    const existing = await tx.cartItem.findUnique({ where: key });

    const newQty = (existing?.quantity ?? 0) + quantity;
    if (newQty > config.maxQtyPerItem) {
      throw new AppError(400, "QUANTITY_LIMIT", `You can add at most ${config.maxQtyPerItem} of one item`);
    }
    if (newQty > product.stock) {
      throw new AppError(409, "INSUFFICIENT_STOCK", `Only ${product.stock} of "${product.name}" left in stock`, {
        available: product.stock,
      });
    }

    await tx.cartItem.upsert({
      where: key,
      create: { cartId: cart.id, productId, quantity: newQty },
      update: { quantity: newQty },
    });
  });
  return getCart(userId);
}

export async function updateItemQuantity(userId: string, itemId: string, quantity: number) {
  // Scoping by cart.userId means a user can never touch someone else's cart item.
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: { select: { stock: true, isActive: true, name: true } } },
  });
  if (!item) throw notFound("Cart item");
  if (!item.product.isActive) throw new AppError(409, "PRODUCT_UNAVAILABLE", `"${item.product.name}" is no longer available`);
  if (quantity > item.product.stock) {
    throw new AppError(409, "INSUFFICIENT_STOCK", `Only ${item.product.stock} of "${item.product.name}" left in stock`, {
      available: item.product.stock,
    });
  }
  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return getCart(userId);
}

export async function removeItem(userId: string, itemId: string) {
  const { count } = await prisma.cartItem.deleteMany({ where: { id: itemId, cart: { userId } } });
  if (count === 0) throw notFound("Cart item");
  return getCart(userId);
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { cart: { userId } } });
  return getCart(userId);
}
