/** Errors we throw on purpose. Anything else is treated as a 500. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Resource") =>
  new AppError(404, "NOT_FOUND", `${what} not found`);

export const unauthorized = (message = "Authentication required") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "You do not have permission to do that") =>
  new AppError(403, "FORBIDDEN", message);
