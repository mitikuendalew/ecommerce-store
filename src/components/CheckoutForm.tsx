"use client";

import Field, { SelectField } from "./Field";

const COUNTRIES: [string, string][] = [
  ["ET", "Ethiopia"], ["KE", "Kenya"], ["US", "United States"], ["GB", "United Kingdom"],
  ["CA", "Canada"], ["DE", "Germany"], ["FR", "France"], ["AE", "United Arab Emirates"], ["IN", "India"],
]; // extend as needed

const METHODS = [
  { value: "CARD", label: "Card", desc: "Pay securely online" },
  { value: "MOBILE_MONEY", label: "Mobile money", desc: "Pay from your phone wallet" },
  { value: "CASH_ON_DELIVERY", label: "Cash on delivery", desc: "Pay when your order arrives" },
];

type Props = {
  id: string;
  defaultName?: string;
  errors: Record<string, string>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function CheckoutForm({ id, defaultName, errors, onSubmit }: Props) {
  return (
    <form id={id} onSubmit={onSubmit} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-lg font-bold">Shipping address</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" autoComplete="name" required defaultValue={defaultName} error={errors.fullName} />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" required hint="Include the country code, e.g. +251 9…" error={errors.phone} />
        </div>
        <Field label="Address" name="line1" autoComplete="address-line1" required error={errors.line1} />
        <Field label="Apartment, suite, etc." name="line2" autoComplete="address-line2" optional error={errors.line2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="city" autoComplete="address-level2" required error={errors.city} />
          <Field label="Region / state" name="region" autoComplete="address-level1" optional error={errors.region} />
          <Field label="Postal code" name="postalCode" autoComplete="postal-code" optional error={errors.postalCode} />
          <SelectField label="Country" name="country" autoComplete="country" required defaultValue="" error={errors.country}>
            <option value="" disabled>Select a country</option>
            {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </SelectField>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-bold">Payment method</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {METHODS.map((m, i) => (
            <label key={m.value} className="cursor-pointer">
              <input type="radio" name="paymentMethod" value={m.value} defaultChecked={i === 0} required className="peer sr-only" />
              <span className="block h-full rounded-xl border border-gray-300 p-4 hover:border-gray-500 peer-checked:border-indigo-600 peer-checked:ring-2 peer-checked:ring-indigo-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-600">
                <span className="block text-sm font-semibold">{m.label}</span>
                <span className="mt-1 block text-sm text-gray-600">{m.desc}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.paymentMethod && <p className="mt-2 text-sm font-medium text-red-700">{errors.paymentMethod}</p>}
      </fieldset>
    </form>
  );
}
