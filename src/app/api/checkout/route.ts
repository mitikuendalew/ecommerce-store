import { handle, ok, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validators";
import { createOrderFromCart } from "@/services/order.service";

export const POST = handle(async (req) => {
  const { userId } = await requireUser(req);
  const input = checkoutSchema.parse(await parseJson(req));
  const order = await createOrderFromCart(userId, input);
  // For CARD / MOBILE_MONEY the client now sends the user to the gateway using order.payments[0].id.
  return ok({ order, payment: order.payments[0] }, 201);
});
