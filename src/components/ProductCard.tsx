import Link from "next/link";
import { money } from "@/lib/format";
import { focusRing } from "@/lib/styles";
import type { Product } from "@/lib/types";
import { ImageIcon } from "./icons";

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images[0];
  const soldOut = product.stock <= 0;

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt ?? ""}
            loading="lazy"
            className="size-full object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-gray-400"><ImageIcon width={40} height={40} /></div>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">Sold out</span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-600">{product.category.name}</p>
      <h3 className="mt-1 text-sm font-semibold text-gray-900">
        {/* The whole card is clickable via the stretched link, but screen readers get one clean link */}
        <Link href={`/products/${product.slug}`} className={`rounded after:absolute after:inset-0 ${focusRing}`}>
          {product.name}
        </Link>
      </h3>
      <p className="mt-1 text-base font-bold text-gray-900">{money(product.priceCents)}</p>
    </article>
  );
}
