import { handle, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listOrders } from "@/services/order.service";

export const GET = handle(async (req) => {
  const { userId } = await requireUser(req);
  return ok(await listOrders(userId));
});
