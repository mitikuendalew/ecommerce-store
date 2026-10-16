import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

/** Next 15+ passes route params as a Promise. */
export type Ctx<T> = { params: Promise<T> };

/** Success envelope: { data } */
export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ data }, { status });

/** Parse a JSON body, turning malformed JSON into a clean 400. */
export async function parseJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}

function errorBody(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Postgres SQLSTATE code, whether thrown directly by the driver or wrapped by Drizzle (`err.cause`). */
function pgErrorCode(err: unknown): string | undefined {
  for (let e = err as { code?: unknown; cause?: unknown } | undefined, i = 0; e && i < 3; e = e.cause as typeof e, i++) {
    if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code)) return e.code;
  }
  return undefined;
}

export function toErrorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return errorBody(
      400,
      "VALIDATION_ERROR",
      "Some fields are invalid",
      err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }

  if (err instanceof AppError) {
    return errorBody(err.status, err.code, err.message, err.details);
  }

  switch (pgErrorCode(err)) {
    case "23505": // unique constraint
      return errorBody(409, "CONFLICT", "A record with this value already exists");
    case "23503": // foreign key
      return errorBody(400, "INVALID_REFERENCE", "A referenced record does not exist");
    case "23514": // check constraint (e.g. stock would go negative)
      return errorBody(409, "CONFLICT", "That change isn't allowed");
  }

  // Unknown: log full detail server-side, return nothing sensitive.
  console.error("[unhandled]", err);
  return errorBody(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

/** Wrap a route handler so every thrown error becomes a consistent JSON response. */
export function handle<C = unknown>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
