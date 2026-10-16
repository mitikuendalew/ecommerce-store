"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { focusRing, iconBtn } from "@/lib/styles";
import { CartIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Storefront";
const navLink = `rounded px-1 text-sm font-medium text-gray-700 hover:text-indigo-700 ${focusRing}`;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  const { cart } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const count = cart?.itemCount ?? 0;

  // Close the mobile menu on navigation and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
  }

  async function onLogout() {
    await logout();
    router.push("/");
  }

  const accountHref = status === "authenticated" ? "/dashboard" : "/login";
  const accountLabel = status === "authenticated" ? (user?.name.split(" ")[0] ?? "Account") : "Sign in";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
        <button
          type="button"
          className={`md:hidden ${iconBtn}`}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon width={24} height={24} /> : <MenuIcon width={24} height={24} />}
        </button>

        <Link href="/" className={`rounded text-xl font-bold tracking-tight text-gray-900 ${focusRing}`}>
          {STORE_NAME}
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-5 md:flex">
          <Link href="/products" className={navLink}>Shop</Link>
          <Link href="/products?sort=newest" className={navLink}>New arrivals</Link>
        </nav>

        {/* Search drops to its own full-width row on small screens */}
        <form role="search" onSubmit={onSearch} className="order-last w-full md:order-none md:mx-auto md:w-auto md:max-w-md md:flex-1">
          <label htmlFor="site-search" className="sr-only">Search products</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="site-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products"
              className="block min-h-11 w-full rounded-full border border-gray-300 bg-gray-50 pl-10 pr-4 text-base placeholder:text-gray-500 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-indigo-600 sm:text-sm"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href={accountHref} className={`hidden min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 md:inline-flex ${focusRing}`}>
            <UserIcon /> {accountLabel}
          </Link>
          <Link
            href="/cart"
            className={`relative ${iconBtn}`}
            aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
          >
            <CartIcon width={24} height={24} />
            {count > 0 && (
              <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-gray-200 md:hidden">
          <nav aria-label="Mobile" className="mx-auto flex max-w-7xl flex-col px-4 py-2 sm:px-6">
            {[
              ["/products", "Shop"],
              ["/products?sort=newest", "New arrivals"],
              [accountHref, status === "authenticated" ? "My account" : "Sign in / Create account"],
            ].map(([href, label]) => (
              <Link key={label} href={href} className={`flex min-h-11 items-center rounded px-2 text-base font-medium text-gray-900 hover:bg-gray-50 ${focusRing}`}>
                {label}
              </Link>
            ))}
            {status === "authenticated" && (
              <button type="button" onClick={onLogout} className={`flex min-h-11 items-center rounded px-2 text-left text-base font-medium text-gray-900 hover:bg-gray-50 ${focusRing}`}>
                Sign out
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
