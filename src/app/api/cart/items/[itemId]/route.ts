import { type Ctx, handle, ok, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateCartItemSchema } from "@/lib/validators";
import { removeItem, updateItemQuantity } from "@/services/cart.service";

type P = Ctx<{ itemId: string }>;

// Sets the quantity (absolute, not a delta)
export const PATCH = handle<P>(async (req, { params }) => {
  const { userId } = await requireUser(req);
  const { itemId } = await params;
  const { quantity } = updateCartItemSchema.parse(await parseJson(req));
  return ok(await updateItemQuantity(userId, itemId, quantity));
});

export const DELETE = handle<P>(async (req, { params }) => {
  const { userId } = await requireUser(req);
  const { itemId } = await params;
  return ok(await removeItem(userId, itemId));
});
