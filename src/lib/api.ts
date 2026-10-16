import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
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

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // unique constraint
        return errorBody(409, "CONFLICT", "A record with this value already exists", {
          fields: err.meta?.target,
        });
      case "P2025": // record not found
        return errorBody(404, "NOT_FOUND", "Record not found");
      case "P2003": // foreign key
        return errorBody(400, "INVALID_REFERENCE", "A referenced record does not exist");
    }
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
