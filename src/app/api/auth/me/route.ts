import { handle, ok, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validators";
import { getCurrentUser, updateProfile } from "@/services/auth.service";

export const GET = handle(async (req) => {
  const { userId } = await requireUser(req);
  return ok({ user: await getCurrentUser(userId) });
});

export const PATCH = handle(async (req) => {
  const { userId } = await requireUser(req);
  const { name } = updateProfileSchema.parse(await parseJson(req));
  return ok({ user: await updateProfile(userId, name) });
});
