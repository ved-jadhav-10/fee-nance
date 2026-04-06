import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { ProfileSettings } from "@/components/profile/profile-settings";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-5 py-12 text-[var(--color-text)] md:px-10">
      <div className="app-shell flex flex-col gap-8">
        <header className="panel flex flex-wrap items-center justify-between gap-4 p-7">
          <div className="space-y-1">
            <p className="section-overline">Your Week</p>
            <h1 className="font-display text-[40px] text-[var(--color-text)]">
              Dashboard <span className="display-highlight">pulse</span>
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Welcome, {session.user.name ?? session.user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="btn-ghost px-3 py-2 text-[12px] uppercase tracking-[0.16em]"
              href="/finance"
            >
              Finance
            </Link>
            <Link
              className="btn-ghost px-3 py-2 text-[12px] uppercase tracking-[0.16em]"
              href="/groups"
            >
              Groups
            </Link>
            <SignOutButton />
          </div>
        </header>

        <ProfileSettings />
        <DashboardOverview />
      </div>
    </main>
  );
}
