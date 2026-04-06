import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FinanceManager } from "@/components/finance/finance-manager";

export default async function FinancePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-5 py-12 text-[var(--color-text)] md:px-10">
      <div className="app-shell flex flex-col gap-8">
        <header className="panel flex flex-wrap items-center justify-between gap-4 p-7">
          <div className="space-y-1">
            <p className="section-overline">Finance Command</p>
            <h1 className="font-display text-[40px] text-[var(--color-text)]">
              Money <span className="display-highlight">workspace</span>
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Create, edit, and track transaction decisions with clarity.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="btn-ghost px-3 py-2 text-[12px] uppercase tracking-[0.16em]"
            >
              Dashboard
            </Link>
            <Link
              href="/groups"
              className="btn-ghost px-3 py-2 text-[12px] uppercase tracking-[0.16em]"
            >
              Groups
            </Link>
          </div>
        </header>

        <FinanceManager />
      </div>
    </main>
  );
}
