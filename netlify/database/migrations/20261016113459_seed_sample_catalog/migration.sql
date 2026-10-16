-- Sample catalog so the storefront isn't empty on first deploy (replaces prisma/seed.ts).
INSERT INTO "categories" ("id", "name", "slug") VALUES
  ('cat_clothing', 'Clothing', 'clothing'),
  ('cat_electronics', 'Electronics', 'electronics')
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
INSERT INTO "products" ("id", "name", "slug", "description", "price_cents", "sku", "stock", "category_id") VALUES
  ('prd_cotton_t_shirt', 'Cotton T-Shirt', 'cotton-t-shirt', 'Cotton T-Shirt — sample product.', 1999, 'TSH-001', 50, 'cat_clothing'),
  ('prd_wireless_earbuds', 'Wireless Earbuds', 'wireless-earbuds', 'Wireless Earbuds — sample product.', 5999, 'EAR-001', 25, 'cat_electronics')
ON CONFLICT ("slug") DO NOTHING;
