import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { container } from "@/lib/styles";

export const metadata: Metadata = { title: "Sign in" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const rawNext = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  // Only allow same-site relative paths — prevents open-redirect abuse of ?next=
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const mode = sp.mode === "register" ? "register" : "login";

  return (
    <div className={`${container} py-14`}>
      <AuthForm next={next} initialMode={mode} />
    </div>
  );
}
