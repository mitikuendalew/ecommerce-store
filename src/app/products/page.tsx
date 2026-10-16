import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { productQuerySchema } from "@/lib/validators";
import { listCategories, listProducts } from "@/services/product.service";
import { btnPrimary, container, focusRing, inputCls } from "@/lib/styles";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop" };

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = first(sp.q)?.trim() || undefined;
  const category = first(sp.category) || undefined;
  const sort = first(sp.sort) || "newest";
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const params = new URLSearchParams({ sort, page: String(page), pageSize: "12" });
  if (q) params.set("q", q);
  if (category) params.set("category", category);

  const [result, categories] = await Promise.all([
    Promise.resolve()
      .then(() => listProducts(productQuerySchema.parse(Object.fromEntries(params))))
      .catch((err) => (console.error("[products]", err), null)),
    listCategories().catch(() => [] as Category[]),
  ]);

  const pageHref = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    return `/products?${next}`;
  };

  return (
    <div className={`${container} py-10`}>
      <h1 className="text-3xl font-bold tracking-tight">{q ? `Results for “${q}”` : "All products"}</h1>

      <form action="/products" method="get" className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div>
          <label htmlFor="f-q" className="mb-1 block text-sm font-medium">Search</label>
          <input id="f-q" name="q" type="search" defaultValue={q} placeholder="Search products" className={`${inputCls} border-gray-300`} />
        </div>
        <div>
          <label htmlFor="f-cat" className="mb-1 block text-sm font-medium">Category</label>
          <select id="f-cat" name="category" defaultValue={category ?? ""} className={`${inputCls} border-gray-300`}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-sort" className="mb-1 block text-sm font-medium">Sort by</label>
          <select id="f-sort" name="sort" defaultValue={sort} className={`${inputCls} border-gray-300`}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </div>
        <button type="submit" className={btnPrimary}>Apply</button>
      </form>

      {!result ? (
        <p role="alert" className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          We couldn&apos;t load products right now. Please refresh the page in a moment.
        </p>
      ) : result.items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="font-semibold">No products found</p>
          <p className="mt-1 text-gray-600">Try a different search or clear the filters.</p>
          <Link href="/products" className={`${btnPrimary} mt-6`}>Clear filters</Link>
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-gray-600" aria-live="polite">{result.total} {result.total === 1 ? "product" : "products"}</p>
          <h2 className="sr-only">Products</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {result.items.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
          </ul>
          {result.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-between">
              {page > 1 ? <Link href={pageHref(page - 1)} className={`rounded px-3 py-2 font-semibold text-indigo-700 hover:underline ${focusRing}`}>← Previous</Link> : <span />}
              <span className="text-sm text-gray-600">Page {result.page} of {result.totalPages}</span>
              {page < result.totalPages ? <Link href={pageHref(page + 1)} className={`rounded px-3 py-2 font-semibold text-indigo-700 hover:underline ${focusRing}`}>Next →</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
