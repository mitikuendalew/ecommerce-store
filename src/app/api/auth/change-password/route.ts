import { handle, ok, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validators";
import { changePassword } from "@/services/auth.service";

export const POST = handle(async (req) => {
  const { userId } = await requireUser(req);
  const { currentPassword, newPassword } = changePasswordSchema.parse(await parseJson(req));
  await changePassword(userId, currentPassword, newPassword);
  return ok({ changed: true });
});
