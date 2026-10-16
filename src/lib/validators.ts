import { z } from "zod";
import { config } from "./config";

// ── Auth ──
const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters") // bcrypt ignores bytes past 72
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  password: passwordRule,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(72),
  newPassword: passwordRule,
});

// ── Catalog ──
export const productQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(100).optional(), // category slug
    minPrice: z.coerce.number().int().min(0).optional(), // cents
    maxPrice: z.coerce.number().int().min(0).optional(), // cents
    sort: z.enum(["newest", "price_asc", "price_desc", "name"]).default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
  })
  .refine(
    (d) => d.minPrice === undefined || d.maxPrice === undefined || d.minPrice <= d.maxPrice,
    { message: "minPrice must be less than or equal to maxPrice", path: ["minPrice"] },
  );

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .max(200)
    .optional(), // generated from name when omitted
  description: z.string().trim().min(1).max(5000),
  priceCents: z.number().int().min(0).max(100_000_000),
  sku: z.string().trim().min(1).max(64),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  categoryId: z.string().min(1),
  images: z
    .array(z.object({ url: z.string().url(), alt: z.string().max(200).optional() }))
    .max(10)
    .default([]),
});

// ── Cart ──
const quantity = z.number().int().min(1).max(config.maxQtyPerItem);

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: quantity.default(1),
});

export const updateCartItemSchema = z.object({ quantity });

// ── Checkout ──
export const checkoutSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number"),
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(100),
    region: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(20).optional(),
    country: z.string().trim().length(2, "Use a 2-letter country code").toUpperCase(),
  }),
  paymentMethod: z.enum(["CARD", "MOBILE_MONEY", "CASH_ON_DELIVERY"]),
});

// ── Payments webhook (adapt to your gateway's real payload) ──
export const paymentWebhookSchema = z.object({
  transactionId: z.string().min(1),
  providerRef: z.string().min(1),
  status: z.enum(["succeeded", "failed"]),
  failureReason: z.string().max(500).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
