import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { forbidden, unauthorized } from "./errors";

export type SessionRole = "CUSTOMER" | "ADMIN";
export type Session = { userId: string; role: SessionRole };

export const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(session: Session) {
  return new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // blocks cross-site POSTs, which covers most CSRF
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE_NAME);
}

/** Reads `Authorization: Bearer <jwt>` first (mobile/API clients), then the cookie (browser). */
export async function getSession(req: Request): Promise<Session | null> {
  const header = req.headers.get("authorization");
  let token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const role = payload.role;
    if (typeof payload.sub !== "string" || (role !== "CUSTOMER" && role !== "ADMIN")) {
      return null;
    }
    return { userId: payload.sub, role };
  } catch {
    return null; // expired, tampered, malformed → treat as logged out
  }
}

export async function requireUser(req: Request): Promise<Session> {
  const session = await getSession(req);
  if (!session) throw unauthorized();
  return session;
}

export async function requireAdmin(req: Request): Promise<Session> {
  const session = await requireUser(req);
  if (session.role !== "ADMIN") throw forbidden();
  return session;
}
