import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
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

  return prisma.$transaction(
    async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true } } },
      });
      if (!cart || cart.items.length === 0) {
        throw new AppError(400, "CART_EMPTY", "Your cart is empty");
      }

      // Stable order avoids deadlocks when two checkouts touch the same products.
      const items = [...cart.items].sort((x, y) => x.productId.localeCompare(y.productId));

      for (const item of items) {
        if (!item.product.isActive) {
          throw new AppError(409, "PRODUCT_UNAVAILABLE", `"${item.product.name}" is no longer available`, {
            productId: item.productId,
          });
        }
        const { count } = await tx.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (count === 0) {
          throw new AppError(409, "INSUFFICIENT_STOCK", `Not enough stock for "${item.product.name}"`, {
            productId: item.productId,
            requested: item.quantity,
            available: item.product.stock,
          });
        }
      }

      const subtotal = items.reduce((sum, i) => sum + i.product.priceCents * i.quantity, 0);
      const totals = calculateTotals(subtotal);

      const order = await tx.order.create({
        data: {
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
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              productName: i.product.name,
              sku: i.product.sku,
              unitPriceCents: i.product.priceCents,
              quantity: i.quantity,
              lineTotalCents: i.product.priceCents * i.quantity,
            })),
          },
          payments: {
            create: {
              method: paymentMethod,
              amountCents: totals.totalCents,
              currency: config.currency,
              status: "PENDING",
            },
          },
        },
        include: { items: true, payments: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return order;
    },
    { timeout: 15_000 },
  );
}

export function listOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: true, payments: { select: { id: true, method: true, status: true, amountCents: true } } },
  });
}

export async function getOrder(userId: string, orderId: string) {
  // Scoped by userId: asking for someone else's order id looks exactly like "not found".
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true, payments: true },
  });
  if (!order) throw notFound("Order");
  return order;
}
