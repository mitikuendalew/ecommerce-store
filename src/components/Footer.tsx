import Link from "next/link";
import { focusRing } from "@/lib/styles";

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Storefront";
const link = `rounded text-sm text-gray-600 hover:text-indigo-700 hover:underline ${focusRing}`;

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="text-lg font-bold text-gray-900">{STORE_NAME}</p>
          <p className="mt-2 max-w-xs text-sm text-gray-600">Quality products, honest prices, and delivery you can count on.</p>
        </div>
        <nav aria-label="Shop">
          <h2 className="text-sm font-semibold text-gray-900">Shop</h2>
          <ul className="mt-3 space-y-2">
            <li><Link href="/products" className={link}>All products</Link></li>
            <li><Link href="/products?sort=newest" className={link}>New arrivals</Link></li>
            <li><Link href="/products?sort=price_asc" className={link}>Best prices</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account">
          <h2 className="text-sm font-semibold text-gray-900">Account</h2>
          <ul className="mt-3 space-y-2">
            <li><Link href="/dashboard" className={link}>My orders</Link></li>
            <li><Link href="/cart" className={link}>Cart</Link></li>
            <li><Link href="/login" className={link}>Sign in</Link></li>
          </ul>
        </nav>
        <nav aria-label="Support">
          <h2 className="text-sm font-semibold text-gray-900">Support</h2>
          <ul className="mt-3 space-y-2">
            <li><a href="mailto:support@example.com" className={link}>Contact us</a></li>
            <li><span className="text-sm text-gray-600">Mon–Fri, 9:00–17:00</span></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-gray-200 py-6 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} {STORE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
