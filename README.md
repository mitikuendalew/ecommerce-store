# E-commerce store — Next.js (App Router) + Tailwind frontend, Prisma + PostgreSQL + Zod backend

Written for **Next.js 15+ (App Router)**, **Prisma 6**, **Zod 3 or 4**. Files go under `src/` (alias `@/` → `src/`).

## Setup

```bash
# 1. New app: choose TypeScript, Tailwind, ESLint, App Router, `src/` directory, import alias @/*
npx create-next-app@latest shop && cd shop

# 2. Copy this project's `src/`, `prisma/`, `.env.example` and README over the generated ones, then:
npm i @prisma/client@6 zod jose bcryptjs
npm i -D prisma@6 tsx @types/bcryptjs

cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, PAYMENT_WEBHOOK_SECRET
npx prisma migrate dev --name init
npx tsx prisma/seed.ts      # admin user + sample catalog
```

Add to package.json: `"prisma": { "seed": "tsx prisma/seed.ts" }`

Recommended extra migration (DB-level safety net against negative stock) — add to a new migration's SQL:

```sql
ALTER TABLE "Product" ADD CONSTRAINT product_stock_nonneg CHECK ("stock" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT product_price_nonneg CHECK ("priceCents" >= 0);
ALTER TABLE "CartItem" ADD CONSTRAINT cartitem_qty_pos CHECK ("quantity" > 0);
```

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create customer account, sets session cookie |
| POST | `/api/auth/login` | – | Log in, sets session cookie |
| POST | `/api/auth/logout` | – | Clear cookie |
| GET | `/api/auth/me` | user | Current user |
| PATCH | `/api/auth/me` | user | Update profile `{name}` |
| POST | `/api/auth/change-password` | user | `{currentPassword, newPassword}` |
| GET | `/api/products` | – | List/search/filter/sort/paginate |
| GET | `/api/products/:idOrSlug` | – | Single product |
| POST | `/api/products` | admin | Create product |
| GET | `/api/categories` | – | Categories |
| GET | `/api/cart` | user | View cart with totals |
| DELETE | `/api/cart` | user | Clear cart |
| POST | `/api/cart/items` | user | Add `{productId, quantity}` |
| PATCH | `/api/cart/items/:itemId` | user | Set `{quantity}` |
| DELETE | `/api/cart/items/:itemId` | user | Remove item |
| POST | `/api/checkout` | user | Cart → order (+ pending payment) |
| GET | `/api/orders`, `/api/orders/:id` | user | Order history / detail |
| POST | `/api/payments/webhook` | HMAC | Gateway callback → marks payment/order paid |

Auth: browser clients use the httpOnly `session` cookie; API/mobile clients send `Authorization: Bearer <token>`.

## Response format

```jsonc
// success
{ "data": { ... } }
// error
{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid",
             "details": [{ "path": "email", "message": "Invalid email address" }] } }
```

Codes: `VALIDATION_ERROR` 400 · `INVALID_JSON` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 ·
`EMAIL_TAKEN`/`CONFLICT`/`INSUFFICIENT_STOCK`/`PRODUCT_UNAVAILABLE` 409 · `CART_EMPTY` 400 · `INTERNAL_ERROR` 500

## Try it

```bash
curl -c jar -X POST localhost:3000/api/auth/register -H 'content-type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","password":"Passw0rdOK"}'

curl -b jar -X POST localhost:3000/api/cart/items -H 'content-type: application/json' \
  -d '{"productId":"<id from GET /api/products>","quantity":2}'

curl -b jar -X POST localhost:3000/api/checkout -H 'content-type: application/json' \
  -d '{"paymentMethod":"CASH_ON_DELIVERY","shippingAddress":{"fullName":"Test User","phone":"+251911000000","line1":"123 Main St","city":"Addis Ababa","country":"ET"}}'
```

## Frontend map

| Route | File | Notes |
|---|---|---|
| shared layout | `src/app/layout.tsx`, `components/Navbar.tsx`, `Footer.tsx` | skip link, landmarks, cart badge, search, mobile menu |
| `/` | `src/app/page.tsx` | hero, category grid, "Trending now" (= newest until you track sales/views) |
| `/products` | `src/app/products/page.tsx` | search/category/sort filters work without JS; pagination |
| `/products/[slug]` | `src/app/products/[slug]/page.tsx` + `ImageGallery`, `PurchasePanel`, `StockStatus` | |
| `/cart` | `src/app/cart/page.tsx` + `CartView`, `CheckoutForm` | items, quantity controls, subtotal, checkout form |
| `/dashboard` | `src/app/dashboard/page.tsx` + `OrdersPanel`, `ProfilePanel` | order history, profile, password |
| `/login` | `src/app/login/page.tsx` + `AuthForm` | sign in / register, safe `?next=` redirect |

State lives in `lib/auth-context.tsx` and `lib/cart-context.tsx`. Every cart change returns the full server-priced cart,
so the browser never calculates prices. `lib/client.ts` is the only place that calls `fetch`.

Tailwind: written for v4 (`@import "tailwindcss"` in `globals.css`); on v3.4 swap that line for the three `@tailwind` directives.
Images use plain `<img>` so any CDN works without `next.config` changes; switch to `next/image` once you know your image hosts.

**Variant selectors** (Size, Color…) render when a product has `options: [{ name, values }]`. The backend schema has no
variants yet, so nothing shows today — adding `ProductVariant` (with its own SKU/stock/price) and a `variantId` on
cart and order items is the next backend change.

## Not included yet (worth doing next)

- Variants in the schema, cart and orders (see above)

- Rate limiting on `/api/auth/login` and `/register` (e.g. Upstash Ratelimit)
- Releasing reserved stock when a PENDING order expires or is cancelled
- Admin endpoints for order status updates, product edit/delete, refunds
- A real gateway integration behind `payment.service.ts` and the webhook
- Idempotency-Key support on `/api/checkout` to protect against double-clicks
