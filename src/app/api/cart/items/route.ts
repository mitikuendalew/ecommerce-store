import { handle, ok, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { addToCartSchema } from "@/lib/validators";
import { addItem } from "@/services/cart.service";

// Adds to the existing quantity if the product is already in the cart.
export const POST = handle(async (req) => {
  const { userId } = await requireUser(req);
  const { productId, quantity } = addToCartSchema.parse(await parseJson(req));
  return ok(await addItem(userId, productId, quantity), 201);
});
