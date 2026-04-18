import { AnalyticsSuite } from "@/components/analytics/analytics-suite";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <p className="section-overline">Insights</p>
        <h1 className="font-display text-[40px]">
          Analytics <span className="display-highlight">suite</span>
        </h1>
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          Deep-dive into your financial health — income, deductions, spending taxonomy, and trajectory.
        </p>
      </div>
      <AnalyticsSuite />
    </div>
  );
}
