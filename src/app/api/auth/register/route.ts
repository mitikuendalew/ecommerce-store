import { handle, ok, parseJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { registerUser } from "@/services/auth.service";

export const POST = handle(async (req) => {
  const input = registerSchema.parse(await parseJson(req));
  const { user, token } = await registerUser(input);
  await setSessionCookie(token);
  return ok({ user, token }, 201); // token in body is for non-browser clients
});
