const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";

export const money = (cents: number, currency = DEFAULT_CURRENCY) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));
