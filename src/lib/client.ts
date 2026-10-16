/** Thin fetch wrapper for the backend API. Works in server components and in the browser. */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Server-side fetches need an absolute URL; the browser uses same-origin relative URLs.
const BASE =
  typeof window === "undefined"
    ? (process.env.API_URL ?? "http://localhost:3000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "");

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "We couldn't reach the server. Check your connection and try again.");
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? "UNKNOWN",
      json?.error?.message ?? "Something went wrong. Please try again.",
      json?.error?.details,
    );
  }
  return json.data as T;
}

export function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

/** Maps the API's validation details ([{path:"shippingAddress.phone", message}]) to { phone: message }. */
export function fieldErrorsOf(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err instanceof ApiError && Array.isArray(err.details)) {
    for (const d of err.details as { path?: string; message?: string }[]) {
      const key = d.path?.split(".").pop();
      if (key && d.message && !out[key]) out[key] = d.message;
    }
  }
  return out;
}
