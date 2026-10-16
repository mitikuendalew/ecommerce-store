export const config = {
  currency: process.env.STORE_CURRENCY ?? "USD",
  shippingFlatCents: Number(process.env.SHIPPING_FLAT_CENTS ?? 500),
  freeShippingOverCents: Number(process.env.FREE_SHIPPING_OVER_CENTS ?? 10000),
  taxRate: Number(process.env.TAX_RATE ?? 0), // e.g. 0.15 for 15%
  maxQtyPerItem: 99,
};
