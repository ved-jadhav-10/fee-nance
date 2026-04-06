import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GroupManager } from "@/components/groups/group-manager";

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-5 py-8 text-[var(--color-text)] md:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Fee-Nance</p>
            <h1 className="text-3xl leading-tight text-[var(--color-text)]">Groups Workspace</h1>
            <p className="text-sm text-[var(--color-muted)]">Create, join, and manage shared expense groups.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Dashboard
            </Link>
            <Link
              href="/finance"
              className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Finance
            </Link>
          </div>
        </header>

        <GroupManager />
      </div>
    </main>
  );
}
