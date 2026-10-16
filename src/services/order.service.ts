import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cartItems, carts, orderItems, orders, paymentTransactions, products } from "../../db/schema";
import { AppError, notFound } from "@/lib/errors";
import { config } from "@/lib/config";
import type { CheckoutInput } from "@/lib/validators";

function generateOrderNumber() {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function calculateTotals(subtotalCents: number) {
  const shippingCents = subtotalCents >= config.freeShippingOverCents ? 0 : config.shippingFlatCents;
  const taxCents = Math.round(subtotalCents * config.taxRate);
  return { subtotalCents, shippingCents, taxCents, totalCents: subtotalCents + shippingCents + taxCents };
}

/**
 * Turns the user's cart into an order inside ONE transaction:
 *  1. re-read prices + stock from the DB (never trust the client)
 *  2. reserve stock with a guarded atomic decrement (no overselling under concurrency)
 *  3. snapshot items/address, create a PENDING payment, empty the cart
 * If any step throws, everything — including the stock decrements — rolls back.
 */
export async function createOrderFromCart(userId: string, input: CheckoutInput) {
  const { shippingAddress: a, paymentMethod } = input;

  return db.transaction(async (tx) => {
    const [cart] = await tx.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));
    const rows = cart
      ? await tx
          .select({ productId: cartItems.productId, quantity: cartItems.quantity, product: products })
          .from(cartItems)
          .innerJoin(products, eq(cartItems.productId, products.id))
          .where(eq(cartItems.cartId, cart.id))
      : [];
    if (!cart || rows.length === 0) {
      throw new AppError(400, "CART_EMPTY", "Your cart is empty");
    }

    // Stable order avoids deadlocks when two checkouts touch the same products.
    const items = [...rows].sort((x, y) => x.productId.localeCompare(y.productId));

    for (const item of items) {
      if (!item.product.isActive) {
        throw new AppError(409, "PRODUCT_UNAVAILABLE", `"${item.product.name}" is no longer available`, {
          productId: item.productId,
        });
      }
      const updated = await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(and(eq(products.id, item.productId), eq(products.isActive, true), gte(products.stock, item.quantity)))
        .returning({ id: products.id });
      if (updated.length === 0) {
        throw new AppError(409, "INSUFFICIENT_STOCK", `Not enough stock for "${item.product.name}"`, {
          productId: item.productId,
          requested: item.quantity,
          available: item.product.stock,
        });
      }
    }

    const subtotal = items.reduce((sum, i) => sum + i.product.priceCents * i.quantity, 0);
    const totals = calculateTotals(subtotal);

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber: generateOrderNumber(),
        userId,
        status: "PENDING",
        currency: config.currency,
        ...totals,
        shippingName: a.fullName,
        shippingPhone: a.phone,
        shippingLine1: a.line1,
        shippingLine2: a.line2,
        shippingCity: a.city,
        shippingRegion: a.region,
        shippingPostalCode: a.postalCode,
        shippingCountry: a.country,
      })
      .returning();

    const createdItems = await tx
      .insert(orderItems)
      .values(
        items.map((i) => ({
          orderId: order.id,
          productId: i.productId,
          productName: i.product.name,
          sku: i.product.sku,
          unitPriceCents: i.product.priceCents,
          quantity: i.quantity,
          lineTotalCents: i.product.priceCents * i.quantity,
        })),
      )
      .returning();

    const payments = await tx
      .insert(paymentTransactions)
      .values({
        orderId: order.id,
        method: paymentMethod,
        amountCents: totals.totalCents,
        currency: config.currency,
        status: "PENDING",
      })
      .returning();

    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return { ...order, items: createdItems, payments };
  });
}

export async function listOrders(userId: string) {
  const list = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  if (list.length === 0) return [];

  const ids = list.map((o) => o.id);
  const [items, payments] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
    db
      .select({
        id: paymentTransactions.id,
        orderId: paymentTransactions.orderId,
        method: paymentTransactions.method,
        status: paymentTransactions.status,
        amountCents: paymentTransactions.amountCents,
      })
      .from(paymentTransactions)
      .where(inArray(paymentTransactions.orderId, ids)),
  ]);

  return list.map((o) => ({
    ...o,
    items: items.filter((i) => i.orderId === o.id),
    payments: payments.filter((p) => p.orderId === o.id).map(({ orderId: _, ...p }) => p),
  }));
}

export async function getOrder(userId: string, orderId: string) {
  // Scoped by userId: asking for someone else's order id looks exactly like "not found".
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
  if (!order) throw notFound("Order");

  const [items, payments] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(paymentTransactions).where(eq(paymentTransactions.orderId, order.id)),
  ]);
  return { ...order, items, payments };
}
