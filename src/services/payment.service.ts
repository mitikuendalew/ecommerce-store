import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";

/** Idempotent: gateways retry webhooks, so replaying the same event is a no-op. */
export async function recordPaymentResult(opts: {
  transactionId: string;
  providerRef: string;
  succeeded: boolean;
  failureReason?: string;
  payload: Prisma.InputJsonValue;
}) {
  return prisma.$transaction(async (tx) => {
    const txn = await tx.paymentTransaction.findUnique({ where: { id: opts.transactionId } });
    if (!txn) throw notFound("Payment transaction");
    if (txn.status === "SUCCEEDED") return txn; // already settled

    const updated = await tx.paymentTransaction.update({
      where: { id: txn.id },
      data: {
        status: opts.succeeded ? "SUCCEEDED" : "FAILED",
        providerRef: opts.providerRef,
        failureReason: opts.succeeded ? null : (opts.failureReason ?? "Payment failed"),
        rawPayload: opts.payload,
      },
    });

    if (opts.succeeded) {
      await tx.order.updateMany({ where: { id: txn.orderId, status: "PENDING" }, data: { status: "PAID" } });
    }
    return updated;
  });
}
