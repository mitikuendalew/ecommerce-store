"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { btnSecondary, focusRing } from "@/lib/styles";
import OrdersPanel from "./OrdersPanel";
import ProfilePanel from "./ProfilePanel";

export default function DashboardView({ placed }: { placed?: string }) {
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [section, setSection] = useState<"orders" | "profile">("orders");

  useEffect(() => {
    if (status === "anonymous") router.replace("/login?next=/dashboard");
  }, [status, router]);

  if (status !== "authenticated") {
    return <div role="status" aria-busy="true" className="h-40 animate-pulse rounded-xl bg-gray-100"><span className="sr-only">Loading your account…</span></div>;
  }

  const item = (key: "orders" | "profile", text: string) => (
    <button
      type="button"
      onClick={() => setSection(key)}
      aria-current={section === key ? "page" : undefined}
      className={`min-h-11 whitespace-nowrap rounded-lg px-4 text-left text-sm font-semibold ${section === key ? "bg-indigo-50 text-indigo-800" : "text-gray-700 hover:bg-gray-100"} ${focusRing}`}
    >
      {text}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My account</h1>
          <p className="mt-1 text-gray-600">Signed in as {user?.name} ({user?.email})</p>
        </div>
        <button type="button" onClick={async () => { await logout(); router.push("/"); }} className={btnSecondary}>Sign out</button>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[14rem_1fr]">
        <nav aria-label="Account sections" className="flex gap-1 overflow-x-auto md:flex-col">
          {item("orders", "Orders")}
          {item("profile", "Profile & security")}
        </nav>
        <div>{section === "orders" ? <OrdersPanel placed={placed} /> : <ProfilePanel />}</div>
      </div>
    </div>
  );
}
