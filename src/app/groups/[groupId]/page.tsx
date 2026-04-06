import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GroupDetail } from "@/components/groups/group-detail";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { groupId } = await params;

  return (
    <main className="min-h-screen px-5 py-12 text-[var(--color-text)] md:px-10">
      <div className="app-shell flex flex-col gap-8">
        <header className="panel flex flex-wrap items-center justify-between gap-4 p-7">
          <div className="space-y-1">
            <p className="section-overline">Settlement View</p>
            <h1 className="font-display text-[40px] text-[var(--color-text)]">
              Group <span className="display-highlight">detail</span>
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Track splits, net balances, and settlement movement.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/groups"
              className="btn-ghost px-3 py-2 text-[12px] uppercase tracking-[0.16em]"
            >
              Back to Groups
            </Link>
            <Link
              href="/dashboard"
              className="btn-ghost px-3 py-2 text-[12px] uppercase tracking-[0.16em]"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <GroupDetail groupId={groupId} />
      </div>
    </main>
  );
}
