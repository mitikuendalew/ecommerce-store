"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { btnPrimary, focusRing, linkCls } from "@/lib/styles";
import type { Product } from "@/lib/types";
import { MinusIcon, PlusIcon } from "./icons";

const stepBtn = `inline-flex size-11 items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 ${focusRing}`;

export default function PurchasePanel({ product }: { product: Product }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const { add } = useCart();

  const options = product.options ?? [];
  const soldOut = product.stock <= 0;
  const max = Math.max(1, Math.min(product.stock, 99));

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const clamp = (n: number) => Math.min(Math.max(Number.isFinite(n) ? Math.trunc(n) : 1, 1), max);

  async function onAdd() {
    setMsg(null);
    const missing = options.find((o) => !selected[o.name]);
    if (missing) return setMsg({ type: "error", text: `Please choose a ${missing.name.toLowerCase()}.` });
    if (status === "loading") return;
    if (status === "anonymous") return router.push(`/login?next=${encodeURIComponent(pathname)}`);

    setPending(true);
    try {
      await add(product.id, qty, options.length ? selected : undefined);
      setMsg({ type: "ok", text: `Added ${qty} × ${product.name} to your cart.` });
    } catch (e) {
      setMsg({ type: "error", text: errorMessage(e) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {options.map((opt) => (
        <fieldset key={opt.name}>
          <legend className="text-sm font-semibold text-gray-900">
            {opt.name}
            {selected[opt.name] && <span className="font-normal text-gray-600">: {selected[opt.name]}</span>}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {opt.values.map((v) => (
              <label key={v} className="cursor-pointer">
                <input
                  type="radio"
                  name={opt.name}
                  value={v}
                  checked={selected[opt.name] === v}
                  onChange={() => setSelected((s) => ({ ...s, [opt.name]: v }))}
                  className="peer sr-only"
                />
                <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-900 hover:border-gray-500 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-600">
                  {v}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div>
        <span id="qty-label" className="text-sm font-semibold text-gray-900">Quantity</span>
        <div role="group" aria-labelledby="qty-label" className="mt-2 inline-flex items-center overflow-hidden rounded-lg border border-gray-300">
          <button type="button" aria-label="Decrease quantity" disabled={soldOut || qty <= 1} onClick={() => setQty((q) => clamp(q - 1))} className={stepBtn}>
            <MinusIcon />
          </button>
          <input
            aria-label="Quantity"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={soldOut}
            value={qty}
            onChange={(e) => setQty(clamp(Number(e.target.value)))}
            className="h-11 w-14 border-x border-gray-300 text-center text-base focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-50"
          />
          <button type="button" aria-label="Increase quantity" disabled={soldOut || qty >= max} onClick={() => setQty((q) => clamp(q + 1))} className={stepBtn}>
            <PlusIcon />
          </button>
        </div>
      </div>

      <button type="button" onClick={onAdd} disabled={soldOut || pending} className={`${btnPrimary} w-full sm:w-auto sm:min-w-56`}>
        {soldOut ? "Out of stock" : pending ? "Adding…" : "Add to cart"}
      </button>

      <div aria-live="polite" className="min-h-6 text-sm">
        {msg?.type === "ok" && (
          <p className="font-medium text-green-800">
            {msg.text} <Link href="/cart" className={linkCls}>View cart</Link>
          </p>
        )}
        {msg?.type === "error" && <p role="alert" className="font-medium text-red-700">{msg.text}</p>}
      </div>
    </div>
  );
}
