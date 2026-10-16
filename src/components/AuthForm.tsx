"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, errorMessage, fieldErrorsOf } from "@/lib/client";
import { useAuth } from "@/lib/auth-context";
import { btnPrimary, focusRing } from "@/lib/styles";
import Field from "./Field";

export default function AuthForm({ next, initialMode }: { next: string; initialMode: "login" | "register" }) {
  const router = useRouter();
  const { login, register, status } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (status === "authenticated") router.replace(next);
  }, [status, next, router]);

  useEffect(() => {
    if (error) errRef.current?.focus();
  }, [error]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    const password = String(f.get("password") ?? "");
    setError(null);
    setFieldErrors({});
    setPending(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(String(f.get("name") ?? ""), email, password);
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setFieldErrors(fieldErrorsOf(err));
        setError("Please check the highlighted fields.");
      } else setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const tab = (m: "login" | "register", label: string) => (
    <button
      type="button"
      onClick={() => { setMode(m); setError(null); setFieldErrors({}); }}
      aria-pressed={mode === m}
      className={`min-h-11 flex-1 rounded-lg text-sm font-semibold ${mode === m ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"} ${focusRing}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">{tab("login", "Sign in")}{tab("register", "Create account")}</div>
      <h1 className="mt-8 text-2xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {error && (
          <p ref={errRef} tabIndex={-1} role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800 outline-none">
            {error}
          </p>
        )}
        {mode === "register" && <Field label="Full name" name="name" autoComplete="name" required error={fieldErrors.name} />}
        <Field label="Email" name="email" type="email" autoComplete="email" required error={fieldErrors.email} />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          hint={mode === "register" ? "At least 8 characters, with a letter and a number." : undefined}
          error={fieldErrors.password}
        />
        <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
