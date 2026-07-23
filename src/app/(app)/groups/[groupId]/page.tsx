import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { SectionHeader } from "@/components/layout/page-header";
import { GroupDetail } from "@/components/groups/group-detail";
import { GroupDetailAnalytics } from "@/components/groups/group-detail-analytics";

export const metadata: Metadata = { title: "Group" };

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return (
    <div className="space-y-8">
      {/* Explicit back link — the browser's back button isn't the only way out. */}
      <nav aria-label="Breadcrumb">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          All groups
        </Link>
      </nav>

      <GroupDetail groupId={groupId} />

      <section className="space-y-4">
        <SectionHeader
          title="Group analytics"
          description="Spend distribution, settlement flow, and member activity over time."
        />
        <GroupDetailAnalytics groupId={groupId} />
      </section>
    </div>
  );
}
