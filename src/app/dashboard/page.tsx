import type { Metadata } from "next";
import DashboardView from "@/components/DashboardView";
import { container } from "@/lib/styles";

export const metadata: Metadata = { title: "My account" };
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const placed = Array.isArray(sp.placed) ? sp.placed[0] : sp.placed;
  return (
    <div className={`${container} py-10`}>
      <DashboardView placed={placed} />
    </div>
  );
}
