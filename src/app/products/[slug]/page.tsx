import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ImageGallery from "@/components/ImageGallery";
import PurchasePanel from "@/components/PurchasePanel";
import StockStatus from "@/components/StockStatus";
import { AppError } from "@/lib/errors";
import { money } from "@/lib/format";
import { container, focusRing } from "@/lib/styles";
import { getProduct } from "@/services/product.service";

export const dynamic = "force-dynamic";
type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  try {
    return await getProduct(slug);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug).catch(() => null);
  return p ? { title: p.name, description: p.description.slice(0, 155) } : { title: "Product" };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await load(slug);

  return (
    <div className={`${container} py-8 sm:py-12`}>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/products" className={`rounded hover:underline ${focusRing}`}>Shop</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={`/products?category=${product.category.slug}`} className={`rounded hover:underline ${focusRing}`}>{product.category.name}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-gray-900">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ImageGallery images={product.images} name={product.name} />

        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-4 text-3xl font-bold text-gray-900">{money(product.priceCents)}</p>
          <div className="mt-3"><StockStatus stock={product.stock} /></div>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-gray-700">{product.description}</p>
          <PurchasePanel product={product} />
          <dl className="mt-10 border-t border-gray-200 pt-6 text-sm">
            <div className="flex gap-2"><dt className="font-semibold">SKU:</dt><dd className="text-gray-600">{product.sku}</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
