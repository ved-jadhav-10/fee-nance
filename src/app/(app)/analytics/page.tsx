import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsSuite } from "@/components/analytics/analytics-suite";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Trends, category breakdowns and savings trajectory, built from your ledger."
      />
      <AnalyticsSuite />
    </div>
  );
}
