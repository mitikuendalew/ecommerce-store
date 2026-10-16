"use client";

import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { inputCls } from "@/lib/styles";

type Common = { label: string; error?: string; hint?: string; optional?: boolean; className?: string };

function Shell({
  id, label, error, hint, optional, className = "", children,
}: Common & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-900">
        {label}
        {optional && <span className="font-normal text-gray-600"> (optional)</span>}
      </label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1 text-sm text-gray-600">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;

export default function Field({
  label, error, hint, optional, className, ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell {...{ id, label, error, hint, optional, className }}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputCls} ${error ? "border-red-600" : "border-gray-300"}`}
        {...rest}
      />
    </Shell>
  );
}

export function SelectField({
  label, error, hint, optional, className, children, ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Shell {...{ id, label, error, hint, optional, className }}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputCls} ${error ? "border-red-600" : "border-gray-300"}`}
        {...rest}
      >
        {children}
      </select>
    </Shell>
  );
}
