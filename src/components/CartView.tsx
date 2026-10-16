"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, api, errorMessage, fieldErrorsOf } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { money } from "@/lib/format";
import { btnPrimary, btnSecondary, focusRing, linkCls } from "@/lib/styles";
import CheckoutForm from "./CheckoutForm";
import { AlertIcon, ImageIcon, MinusIcon, PlusIcon, TrashIcon } from "./icons";

const stepBtn = `inline-flex size-10 items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 ${focusRing}`;

function Skeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Loading your cart…</span>
      {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />)}
    </div>
  );
}

export default function CartView() {
  const router = useRouter();
  const { user, status } = useAuth();
  const { cart, loading, refresh, setQuantity, remove, clear } = useCart();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errTick, setErrTick] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formError) errorRef.current?.focus(); // move focus to the error summary so screen-reader users hear it
  }, [formError, errTick]);

  async function change(itemId: string, qty: number) {
    setBusyId(itemId);
    setNotice(null);
    try {
      if (qty < 1) await remove(itemId);
      else await setQuantity(itemId, qty);
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    const opt = (k: string) => str(k) || undefined;

    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const { order } = await api<{ order: { orderNumber: string } }>("/api/checkout", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: str("paymentMethod"),
          shippingAddress: {
            fullName: str("fullName"), phone: str("phone"), line1: str("line1"), line2: opt("line2"),
            city: str("city"), region: opt("region"), postalCode: opt("postalCode"), country: str("country"),
          },
        }),
      });
      await refresh();
      router.push(`/dashboard?placed=${encodeURIComponent(order.orderNumber)}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setFieldErrors(fieldErrorsOf(err));
        setFormError("Some details need your attention. Please check the highlighted fields.");
      } else {
        setFormError(errorMessage(err));
        if (err instanceof ApiError && err.status === 409) await refresh(); // stock changed — show the new reality
      }
      setErrTick((t) => t + 1);
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && loading && !cart)) return <Skeleton />;

  if (status === "anonymous") {
    return (
      <div className="rounded-2xl border border-gray-200 p-10 text-center">
        <h2 className="text-xl font-bold">Sign in to see your cart</h2>
        <p className="mt-2 text-gray-600">Your cart is saved to your account so it follows you across devices.</p>
        <Link href="/login?next=/cart" className={`${btnPrimary} mt-6`}>Sign in or create account</Link>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-gray-600">Find something you love and it will show up here.</p>
        <Link href="/products" className={`${btnPrimary} mt-6`}>Start shopping</Link>
      </div>
    );
  }

  const blocked = cart.items.some((i) => !i.available);

  return (
    <div className="grid gap-10 lg:grid-cols-3">
      <div className="space-y-10 lg:col-span-2">
        <section aria-labelledby="items-heading">
          <div className="flex items-center justify-between">
            <h2 id="items-heading" className="text-lg font-bold">Items ({cart.itemCount})</h2>
            <button type="button" onClick={() => clear().catch((e) => setNotice(errorMessage(e)))} className={`rounded text-sm font-medium text-gray-600 hover:text-red-700 hover:underline ${focusRing}`}>
              Clear cart
            </button>
          </div>

          <div aria-live="polite">
            {notice && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{notice}</p>}
          </div>

          <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
            {cart.items.map((item) => {
              const max = Math.max(1, Math.min(item.product.stock, 99));
              const busy = busyId === item.id;
              return (
                <li key={item.id} className="flex gap-4 py-5">
                  <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:size-28">
                    {item.product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.image.url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-gray-400"><ImageIcon width={28} height={28} /></div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row">
                    <div className="min-w-0">
                      <Link href={`/products/${item.product.slug}`} className={`rounded font-semibold text-gray-900 hover:underline ${focusRing}`}>
                        {item.product.name}
                      </Link>
                      <p className="mt-1 text-sm text-gray-600">{money(item.unitPriceCents, cart.currency)} each</p>
                      {!item.available && (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-red-700">
                          <AlertIcon width={16} height={16} />
                          {item.product.stock > 0 ? `Only ${item.product.stock} available — reduce the quantity` : "No longer available — remove to continue"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <div role="group" aria-label={`Quantity for ${item.product.name}`} className="inline-flex items-center overflow-hidden rounded-lg border border-gray-300">
                        <button type="button" aria-label={`Decrease quantity of ${item.product.name}`} disabled={busy || item.quantity <= 1} onClick={() => change(item.id, item.quantity - 1)} className={stepBtn}><MinusIcon /></button>
                        <span className="w-10 text-center text-sm font-semibold" aria-live="polite">{item.quantity}</span>
                        <button type="button" aria-label={`Increase quantity of ${item.product.name}`} disabled={busy || item.quantity >= max} onClick={() => change(item.id, item.quantity + 1)} className={stepBtn}><PlusIcon /></button>
                      </div>
                      <p className="font-bold">{money(item.lineTotalCents, cart.currency)}</p>
                      <button type="button" disabled={busy} onClick={() => change(item.id, 0)} className={`inline-flex min-h-10 items-center gap-1 rounded px-1 text-sm font-medium text-gray-600 hover:text-red-700 ${focusRing}`}>
                        <TrashIcon width={16} height={16} /> Remove<span className="sr-only"> {item.product.name}</span>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="checkout-heading">
          <h2 id="checkout-heading" className="sr-only">Checkout</h2>
          {formError && (
            <div ref={errorRef} tabIndex={-1} role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 outline-none focus-visible:outline-2 focus-visible:outline-red-700">
              {formError}
            </div>
          )}
          <CheckoutForm id="checkout-form" defaultName={user?.name} errors={fieldErrors} onSubmit={onSubmit} />
        </section>
      </div>

      <aside aria-labelledby="summary-heading" className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h2 id="summary-heading" className="text-lg font-bold">Order summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd className="font-semibold">{money(cart.subtotalCents, cart.currency)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Shipping &amp; tax</dt><dd className="text-gray-600">Added at checkout</dd></div>
          </dl>
          <p className="mt-4 border-t border-gray-200 pt-4 text-xs text-gray-600">
            Final shipping and tax are calculated securely on our server when you place the order.
          </p>
          <button type="submit" form="checkout-form" disabled={submitting || blocked} className={`${btnPrimary} mt-6 w-full`}>
            {submitting ? "Placing order…" : "Place order"}
          </button>
          {blocked && <p className="mt-3 text-sm font-medium text-red-700">Fix the unavailable items above to continue.</p>}
          <Link href="/products" className={`${btnSecondary} mt-3 w-full`}>Continue shopping</Link>
          <p className="mt-4 text-center text-xs"><Link href="/dashboard" className={linkCls}>View past orders</Link></p>
        </div>
      </aside>
    </div>
  );
}
