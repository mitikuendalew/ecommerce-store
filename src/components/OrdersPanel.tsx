"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/client";
import { formatDate, money } from "@/lib/format";
import { btnPrimary, btnSecondary, focusRing } from "@/lib/styles";
import type { Order, OrderStatus } from "@/lib/types";

const badge: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  PAID: "bg-blue-100 text-blue-900",
  PROCESSING: "bg-blue-100 text-blue-900",
  SHIPPED: "bg-indigo-100 text-indigo-900",
  DELIVERED: "bg-green-100 text-green-900",
  CANCELLED: "bg-gray-200 text-gray-800",
  REFUNDED: "bg-gray-200 text-gray-800",
};
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export default function OrdersPanel({ placed }: { placed?: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<Order[]>("/api/orders").then(setOrders).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  return (
    <section aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="text-xl font-bold">Order history</h2>

      {placed && (
        <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-900">
          Thank you! Your order <strong>{placed}</strong> has been placed.
        </p>
      )}

      {error ? (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">{error}</p>
          <button type="button" onClick={load} className={`${btnSecondary} mt-3`}>Try again</button>
        </div>
      ) : !orders ? (
        <div role="status" aria-busy="true" className="mt-4 space-y-3">
          <span className="sr-only">Loading your orders…</span>
          {[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-semibold">No orders yet</p>
          <p className="mt-1 text-gray-600">When you place an order, it will appear here.</p>
          <Link href="/products" className={`${btnPrimary} mt-6`}>Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <details className="group rounded-xl border border-gray-200 open:shadow-sm" open={o.orderNumber === placed}>
                <summary className={`flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-xl p-4 ${focusRing}`}>
                  <div>
                    <p className="font-semibold">{o.orderNumber}</p>
                    <p className="text-sm text-gray-600">{formatDate(o.createdAt)} · {o.items.length} {o.items.length === 1 ? "item" : "items"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge[o.status]}`}>{label(o.status)}</span>
                    <span className="font-bold">{money(o.totalCents, o.currency)}</span>
                    <span aria-hidden="true" className="text-gray-500 motion-safe:transition-transform group-open:rotate-180">▾</span>
                  </div>
                </summary>
                <div className="space-y-5 border-t border-gray-200 p-4 text-sm">
                  <ul className="divide-y divide-gray-100">
                    {o.items.map((i) => (
                      <li key={i.id} className="flex justify-between gap-4 py-2">
                        <span>{i.productName} <span className="text-gray-600">× {i.quantity}</span></span>
                        <span className="font-medium">{money(i.lineTotalCents, o.currency)}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="ml-auto max-w-xs space-y-1">
                    <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{money(o.subtotalCents, o.currency)}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-600">Shipping</dt><dd>{money(o.shippingCents, o.currency)}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-600">Tax</dt><dd>{money(o.taxCents, o.currency)}</dd></div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 font-bold"><dt>Total</dt><dd>{money(o.totalCents, o.currency)}</dd></div>
                  </dl>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="font-semibold">Shipping to</h3>
                      <address className="mt-1 not-italic text-gray-600">
                        {o.shippingName}<br />{o.shippingLine1}{o.shippingLine2 ? `, ${o.shippingLine2}` : ""}<br />
                        {o.shippingCity}{o.shippingRegion ? `, ${o.shippingRegion}` : ""} {o.shippingPostalCode ?? ""}<br />{o.shippingCountry}
                      </address>
                    </div>
                    <div>
                      <h3 className="font-semibold">Payment</h3>
                      {o.payments.map((p) => (
                        <p key={p.id} className="mt-1 text-gray-600">{label(p.method)} · {label(p.status)}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
