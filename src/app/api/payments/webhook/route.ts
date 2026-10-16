import { createHmac, timingSafeEqual } from "node:crypto";
import { handle, ok } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { paymentWebhookSchema } from "@/lib/validators";
import { recordPaymentResult } from "@/services/payment.service";

// Generic HMAC-SHA256 verification. Swap for your gateway's own scheme (Stripe, Chapa, …) when you pick one.
function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const POST = handle(async (req) => {
  const raw = await req.text(); // must verify against the exact bytes received
  if (!verifySignature(raw, req.headers.get("x-signature"))) {
    throw new AppError(401, "INVALID_SIGNATURE", "Invalid webhook signature");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const body = paymentWebhookSchema.parse(json);
  await recordPaymentResult({
    transactionId: body.transactionId,
    providerRef: body.providerRef,
    succeeded: body.status === "succeeded",
    failureReason: body.failureReason,
    payload: body,
  });
  return ok({ received: true });
});
