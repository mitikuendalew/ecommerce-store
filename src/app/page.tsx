import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { listCategories, listProducts } from "@/services/product.service";
import { btnGhostOnDark, btnOnDark, container, focusRing } from "@/lib/styles";

export const dynamic = "force-dynamic"; // reads the catalog on each request

const tileColors = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
];

async function safe<T>(p: Promise<T>, fallback: T) {
  try {
    return await p;
  } catch (err) {
    console.error("[home]", err);
    return fallback; // the page should still render if the database is unreachable
  }
}

export default async function HomePage() {
  const [categories, trending] = await Promise.all([
    safe(listCategories(), []),
    // "Trending" = newest for now; swap the sort once you track sales or views.
    safe(listProducts({ sort: "newest", page: 1, pageSize: 8 }), null),
  ]);
  const products = trending?.items ?? [];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 text-white">
        <div className={`${container} py-20 sm:py-28`}>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-50">New season</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
            Everyday essentials, thoughtfully chosen.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-indigo-50">
            Discover products people love, at prices that make sense. Free shipping on larger orders.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className={btnOnDark}>Shop now</Link>
            <a href="#categories" className={btnGhostOnDark}>Browse categories</a>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section id="categories" aria-labelledby="cat-heading" className={`${container} scroll-mt-24 py-16`}>
          <h2 id="cat-heading" className="text-2xl font-bold tracking-tight">Shop by category</h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((c, i) => (
              <li key={c.id}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className={`flex aspect-[4/3] flex-col justify-end rounded-xl bg-gradient-to-br ${tileColors[i % tileColors.length]} p-4 text-white shadow-sm motion-safe:transition-transform hover:-translate-y-0.5 ${focusRing}`}
                >
                  <span className="text-lg font-bold">{c.name}</span>
                  <span className="text-sm font-medium text-white/90">Shop now →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="trending-heading" className={`${container} pb-20 ${categories.length ? "" : "pt-16"}`}>
        <div className="flex items-end justify-between gap-4">
          <h2 id="trending-heading" className="text-2xl font-bold tracking-tight">Trending now</h2>
          <Link href="/products" className="rounded text-sm font-semibold text-indigo-700 hover:underline focus-visible:outline-2 focus-visible:outline-indigo-600">
            View all<span className="sr-only"> products</span> →
          </Link>
        </div>
        {products.length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <li key={p.id}><ProductCard product={p} /></li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-600">
            Products will appear here soon.
          </p>
        )}
      </section>
    </>
  );
}
