import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { orders, paymentTransactions } from "../../db/schema";
import { notFound } from "@/lib/errors";

/** Idempotent: gateways retry webhooks, so replaying the same event is a no-op. */
export async function recordPaymentResult(opts: {
  transactionId: string;
  providerRef: string;
  succeeded: boolean;
  failureReason?: string;
  payload: unknown;
}) {
  return db.transaction(async (tx) => {
    const [txn] = await tx
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, opts.transactionId))
      .for("update");
    if (!txn) throw notFound("Payment transaction");
    if (txn.status === "SUCCEEDED") return txn; // already settled

    const [updated] = await tx
      .update(paymentTransactions)
      .set({
        status: opts.succeeded ? "SUCCEEDED" : "FAILED",
        providerRef: opts.providerRef,
        failureReason: opts.succeeded ? null : (opts.failureReason ?? "Payment failed"),
        rawPayload: opts.payload,
      })
      .where(eq(paymentTransactions.id, txn.id))
      .returning();

    if (opts.succeeded) {
      await tx
        .update(orders)
        .set({ status: "PAID" })
        .where(and(eq(orders.id, txn.orderId), eq(orders.status, "PENDING")));
    }
    return updated;
  });
}
