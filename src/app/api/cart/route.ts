import { handle, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { clearCart, getCart } from "@/services/cart.service";

export const GET = handle(async (req) => {
  const { userId } = await requireUser(req);
  return ok(await getCart(userId));
});

// Clear the whole cart
export const DELETE = handle(async (req) => {
  const { userId } = await requireUser(req);
  return ok(await clearCart(userId));
});
