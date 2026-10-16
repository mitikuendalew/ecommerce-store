import { type Ctx, handle, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/services/order.service";

export const GET = handle<Ctx<{ id: string }>>(async (req, { params }) => {
  const { userId } = await requireUser(req);
  const { id } = await params;
  return ok(await getOrder(userId, id));
});
