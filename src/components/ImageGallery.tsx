"use client";

import { useState } from "react";
import { focusRing } from "@/lib/styles";
import type { ProductImage } from "@/lib/types";
import { ImageIcon } from "./icons";

export default function ImageGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={current.alt ?? `${name} – image ${index + 1}`} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-gray-400">
            <ImageIcon width={64} height={64} /><span className="sr-only">No image available</span>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.id ?? img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-pressed={i === index}
                className={`block aspect-square w-full overflow-hidden rounded-lg border-2 ${i === index ? "border-indigo-600" : "border-transparent hover:border-gray-300"} ${focusRing}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
