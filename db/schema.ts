// Money is ALWAYS stored as integer minor units (cents) to avoid float rounding bugs.
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["CUSTOMER", "ADMIN"]);
export const orderStatus = pgEnum("order_status", [
  "PENDING", // created, awaiting payment
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);
export const paymentStatus = pgEnum("payment_status", ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]);
export const paymentMethod = pgEnum("payment_method", ["CARD", "MOBILE_MONEY", "CASH_ON_DELIVERY"]);

const id = () => text().primaryKey().$defaultFn(() => randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

// ───────────────────────── Users & Auth ─────────────────────────

export const users = pgTable("users", {
  id: id(),
  email: text().notNull().unique(), // stored lowercase
  passwordHash: text("password_hash").notNull(),
  name: text().notNull(),
  role: role().notNull().default("CUSTOMER"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ───────────────────────── Catalog ─────────────────────────

export const categories = pgTable("categories", {
  id: id(),
  name: text().notNull().unique(),
  slug: text().notNull().unique(),
  description: text(),
  createdAt: createdAt(),
});

export const products = pgTable(
  "products",
  {
    id: id(),
    name: text().notNull(),
    slug: text().notNull().unique(),
    description: text().notNull(),
    priceCents: integer("price_cents").notNull(),
    sku: text().notNull().unique(),
    stock: integer().notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_category_id_idx").on(t.categoryId),
    index("products_is_active_created_at_idx").on(t.isActive, t.createdAt),
    index("products_price_cents_idx").on(t.priceCents),
    // DB-level safety net against negative stock / prices
    check("product_stock_nonneg", sql`${t.stock} >= 0`),
    check("product_price_nonneg", sql`${t.priceCents} >= 0`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text().notNull(),
    alt: text(),
    position: integer().notNull().default(0),
  },
  (t) => [index("product_images_product_id_position_idx").on(t.productId, t.position)],
);

// ───────────────────────── Cart ─────────────────────────

export const carts = pgTable("carts", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique() // one active cart per user
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: id(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("cart_items_cart_id_product_id_key").on(t.cartId, t.productId),
    index("cart_items_product_id_idx").on(t.productId),
    check("cartitem_qty_pos", sql`${t.quantity} > 0`),
  ],
);

// ───────────────────────── Orders & Payments ─────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orderNumber: text("order_number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: orderStatus().notNull().default("PENDING"),
    currency: text().notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    taxCents: integer("tax_cents").notNull(),
    totalCents: integer("total_cents").notNull(),

    // Shipping address snapshot (copied at checkout so later profile edits don't rewrite history)
    shippingName: text("shipping_name").notNull(),
    shippingPhone: text("shipping_phone").notNull(),
    shippingLine1: text("shipping_line1").notNull(),
    shippingLine2: text("shipping_line2"),
    shippingCity: text("shipping_city").notNull(),
    shippingRegion: text("shipping_region"),
    shippingPostalCode: text("shipping_postal_code"),
    shippingCountry: text("shipping_country").notNull(),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("orders_status_idx").on(t.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // nullable so deleting a product never destroys order history
    productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(), // snapshot
    sku: text().notNull(), // snapshot
    unitPriceCents: integer("unit_price_cents").notNull(), // snapshot
    quantity: integer().notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_product_id_idx").on(t.productId),
  ],
);

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    method: paymentMethod().notNull(),
    provider: text(), // e.g. "stripe", "chapa" — whichever gateway you wire in
    providerRef: text("provider_ref").unique(), // gateway's transaction/charge id (NULLs allowed multiple times)
    amountCents: integer("amount_cents").notNull(),
    currency: text().notNull(),
    status: paymentStatus().notNull().default("PENDING"),
    failureReason: text("failure_reason"),
    rawPayload: jsonb("raw_payload"), // last webhook payload, for debugging/audit
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("payment_transactions_order_id_idx").on(t.orderId),
    index("payment_transactions_status_idx").on(t.status),
  ],
);
