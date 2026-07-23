import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { FinanceManager } from "@/components/finance/finance-manager";

export const metadata: Metadata = { title: "Transactions" };

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Record income and expenses, set budgets, and keep everything organised with categories."
      />
      <FinanceManager />
    </div>
  );
}
