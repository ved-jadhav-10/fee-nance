import type { Metadata } from "next";

import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { GroupManager } from "@/components/groups/group-manager";
import { GroupAnalyticsSuite } from "@/components/groups/group-analytics-suite";

export const metadata: Metadata = { title: "Groups" };

export default function GroupsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Groups"
        description="Split shared expenses, track who owes what, and settle up."
      />

      <GroupManager />

      <section className="space-y-4">
        <SectionHeader
          title="Your balances"
          description="Where you stand across every group you're part of."
        />
        <GroupAnalyticsSuite />
      </section>
    </div>
  );
}
