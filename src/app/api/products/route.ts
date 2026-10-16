import { handle, ok, parseJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { createProductSchema, productQuerySchema } from "@/lib/validators";
import { createProduct, listProducts } from "@/services/product.service";

// GET /api/products?q=shoe&category=footwear&minPrice=1000&maxPrice=9000&sort=price_asc&page=1&pageSize=12
export const GET = handle(async (req) => {
  const query = productQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok(await listProducts(query));
});

// Admin only
export const POST = handle(async (req) => {
  await requireAdmin(req);
  const input = createProductSchema.parse(await parseJson(req));
  return ok(await createProduct(input), 201);
});
