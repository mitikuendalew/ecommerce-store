import Link from "next/link";
import { btnPrimary, container } from "@/lib/styles";

export default function NotFound() {
  return (
    <div className={`${container} py-24 text-center`}>
      <p className="text-sm font-semibold text-indigo-700">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-gray-600">It may have moved, or the product is no longer available.</p>
      <Link href="/products" className={`${btnPrimary} mt-8`}>Continue shopping</Link>
    </div>
  );
}
