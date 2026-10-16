import type { Metadata } from "next";
import CartView from "@/components/CartView";
import { container } from "@/lib/styles";

export const metadata: Metadata = { title: "Cart & checkout" };

export default function CartPage() {
  return (
    <div className={`${container} py-10`}>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Cart &amp; checkout</h1>
      <CartView />
    </div>
  );
}
