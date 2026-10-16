import { type Ctx, handle, ok } from "@/lib/api";
import { getProduct } from "@/services/product.service";

export const GET = handle<Ctx<{ idOrSlug: string }>>(async (_req, { params }) => {
  const { idOrSlug } = await params;
  return ok(await getProduct(idOrSlug));
});
