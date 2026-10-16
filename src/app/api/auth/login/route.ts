import { handle, ok, parseJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { loginUser } from "@/services/auth.service";

export const POST = handle(async (req) => {
  const input = loginSchema.parse(await parseJson(req));
  const { user, token } = await loginUser(input);
  await setSessionCookie(token);
  return ok({ user, token });
});
