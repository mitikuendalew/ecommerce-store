import { AlertIcon, CheckIcon } from "./icons";

export default function StockStatus({ stock }: { stock: number }) {
  if (stock <= 0)
    return <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700"><AlertIcon width={16} height={16} />Out of stock</p>;
  if (stock <= 5)
    return <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800"><AlertIcon width={16} height={16} />Only {stock} left</p>;
  return <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800"><CheckIcon width={16} height={16} />In stock</p>;
}
