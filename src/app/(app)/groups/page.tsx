import { GroupManager } from "@/components/groups/group-manager";
import { GroupAnalyticsSuite } from "@/components/groups/group-analytics-suite";

export default function GroupsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <p className="section-overline">Shared Ledger</p>
        <h1 className="font-display text-[40px]">
          Group <span className="display-highlight">workspace</span>
        </h1>
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          Create, join, and settle group expenses with precision.
        </p>
      </div>
      <GroupManager />
      <section className="flex flex-col gap-4">
        <div className="space-y-1">
          <p className="section-overline">Analytics</p>
          <h2 className="font-display text-2xl">
            Your <span className="display-highlight">balance overview</span>
          </h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Where you stand across all your groups — who owes you and what you owe.
          </p>
        </div>
        <GroupAnalyticsSuite />
      </section>
    </div>
  );
}
