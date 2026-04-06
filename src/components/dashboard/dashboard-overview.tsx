"use client";

import { useMemo, useState } from "react";
import { useQuery } from "./use-query";

interface DashboardSummary {
  totals: {
    income: number;
    expense: number;
    balance: number;
  };
  groupCount: number;
  categoryBreakdown: Array<{
    categoryId: string | null;
    categoryName: string;
    total: number;
  }>;
  monthlyTrend: Array<{
    year: number;
    month: number;
    income: number;
    expense: number;
  }>;
}

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .slice(0, 10);
const todayIso = today.toISOString().slice(0, 10);

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function DashboardOverview() {
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(todayIso);
  const [isGenerating, setIsGenerating] = useState(false);

  const query = useMemo(
    () =>
      `/api/private/dashboard/summary?startDate=${encodeURIComponent(
        `${startDate}T00:00:00.000Z`,
      )}&endDate=${encodeURIComponent(`${endDate}T23:59:59.999Z`)}`,
    [endDate, startDate],
  );

  const { data, isLoading, error, reload } = useQuery<DashboardSummary>(query);

  const maxCategory =
    data?.categoryBreakdown.reduce((max, category) => Math.max(max, category.total), 0) ?? 0;

  const maxTrendValue =
    data?.monthlyTrend.reduce(
      (max, month) => Math.max(max, month.income, month.expense),
      0,
    ) ?? 0;

  const handleGenerateRecurring = async () => {
    setIsGenerating(true);
    await fetch("/api/private/transactions/recurring/run", { method: "POST" });
    setIsGenerating(false);
    reload();
  };

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading dashboard analytics...</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-red-400">Failed to load dashboard summary.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Start Date
            </label>
            <input
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
              End Date
            </label>
            <input
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-accent)]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleGenerateRecurring}
            disabled={isGenerating}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-contrast)] disabled:opacity-60"
          >
            {isGenerating ? "Running..." : "Run Recurring"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Income</p>
          <p className="mt-2 text-xl text-[var(--color-accent)]">{formatCurrency(data.totals.income)}</p>
        </article>
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Expense</p>
          <p className="mt-2 text-xl text-[var(--color-accent)]">{formatCurrency(data.totals.expense)}</p>
        </article>
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Balance</p>
          <p className="mt-2 text-xl text-[var(--color-accent)]">{formatCurrency(data.totals.balance)}</p>
        </article>
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Groups</p>
          <p className="mt-2 text-xl text-[var(--color-accent)]">{data.groupCount}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-lg">Category Expense Breakdown</h2>
          <div className="mt-4 space-y-3">
            {data.categoryBreakdown.length ? (
              data.categoryBreakdown.map((item) => {
                const width = maxCategory ? Math.max((item.total / maxCategory) * 100, 6) : 0;
                return (
                  <div key={`${item.categoryId}-${item.categoryName}`} className="space-y-1">
                    <div className="flex justify-between text-sm text-[var(--color-muted)]">
                      <span>{item.categoryName}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
                      <div
                        className="h-2 rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No expense data in selected range.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-lg">Monthly Trend</h2>
          <div className="mt-4 space-y-4">
            {data.monthlyTrend.length ? (
              data.monthlyTrend.map((row) => {
                const label = `${String(row.month).padStart(2, "0")}/${row.year}`;
                const incomeWidth = maxTrendValue ? (row.income / maxTrendValue) * 100 : 0;
                const expenseWidth = maxTrendValue ? (row.expense / maxTrendValue) * 100 : 0;

                return (
                  <div key={`${row.year}-${row.month}`} className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
                    <div className="space-y-1">
                      <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
                        <div
                          className="h-2 rounded-full bg-[var(--color-accent)]"
                          style={{ width: `${incomeWidth}%` }}
                        />
                      </div>
                      <div className="h-2 rounded-full bg-[rgba(255,255,255,0.08)]">
                        <div
                          className="h-2 rounded-full bg-[rgba(217,117,70,0.88)]"
                          style={{ width: `${expenseWidth}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-[var(--color-muted)]">
                      <span>Income: {formatCurrency(row.income)}</span>
                      <span>Expense: {formatCurrency(row.expense)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No monthly trend data in selected range.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
