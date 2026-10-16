// Shared class strings. Keeping them here keeps focus rings and touch-target sizes consistent.
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

const btn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const btnPrimary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
export const btnSecondary = `${btn} border border-gray-300 bg-white text-gray-900 hover:bg-gray-50`;
export const btnOnDark = `${btn} bg-white text-indigo-700 hover:bg-indigo-50`;
export const btnGhostOnDark = `${btn} border border-white/70 text-white hover:bg-white/10`;

export const iconBtn = `inline-flex size-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 ${focusRing}`;
export const linkCls = `rounded text-indigo-700 underline-offset-2 hover:underline ${focusRing}`;

export const inputCls =
  "block min-h-11 w-full rounded-lg border bg-white px-3 text-base text-gray-900 placeholder:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo-600 sm:text-sm";

export const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
