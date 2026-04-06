"use client";

import { useState } from "react";
import { useQuery } from "@/components/dashboard/use-query";

type Category = {
  _id: string;
  name: string;
  type: "income" | "expense";
  isSystem: boolean;
};

type Transaction = {
  _id: string;
  type: "income" | "expense";
  title: string;
  amount: number;
  transactionDate: string;
  categoryId?: string;
  recurring?: {
    enabled: boolean;
    frequency?: "monthly" | "yearly";
  };
};

type Budget = {
  _id: string;
  name: string;
  amount: number;
  cycle: "monthly" | "quarterly" | "yearly";
  periodStart: string;
  periodEnd: string;
};

interface FinancePayload {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
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

export function FinanceManager() {
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(todayIso);

  const [transactionForm, setTransactionForm] = useState({
    type: "expense",
    title: "",
    amount: "",
    transactionDate: todayIso,
    categoryId: "",
    recurringEnabled: false,
    recurringFrequency: "monthly",
  });

  const [budgetForm, setBudgetForm] = useState({
    name: "",
    amount: "",
    cycle: "monthly",
    categoryId: "",
    periodStart: monthStart,
    periodEnd: todayIso,
  });

  const { data, isLoading, error, reload } = useQuery<FinancePayload>(
    `/api/private/finance/aggregate?startDate=${encodeURIComponent(
      `${startDate}T00:00:00.000Z`,
    )}&endDate=${encodeURIComponent(`${endDate}T23:59:59.999Z`)}`,
  );

  const handleCreateTransaction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await fetch("/api/private/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: transactionForm.type,
        title: transactionForm.title,
        amount: Number(transactionForm.amount),
        categoryId: transactionForm.categoryId || undefined,
        transactionDate: `${transactionForm.transactionDate}T00:00:00.000Z`,
        recurring: {
          enabled: transactionForm.recurringEnabled,
          frequency: transactionForm.recurringEnabled
            ? transactionForm.recurringFrequency
            : undefined,
          nextRunAt: transactionForm.recurringEnabled
            ? `${transactionForm.transactionDate}T00:00:00.000Z`
            : undefined,
        },
      }),
    });

    setTransactionForm({
      type: "expense",
      title: "",
      amount: "",
      transactionDate: todayIso,
      categoryId: "",
      recurringEnabled: false,
      recurringFrequency: "monthly",
    });

    reload();
  };

  const handleCreateBudget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await fetch("/api/private/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: budgetForm.name,
        amount: Number(budgetForm.amount),
        cycle: budgetForm.cycle,
        categoryId: budgetForm.categoryId || undefined,
        periodStart: `${budgetForm.periodStart}T00:00:00.000Z`,
        periodEnd: `${budgetForm.periodEnd}T23:59:59.999Z`,
      }),
    });

    setBudgetForm({
      name: "",
      amount: "",
      cycle: "monthly",
      categoryId: "",
      periodStart: monthStart,
      periodEnd: todayIso,
    });

    reload();
  };

  const handleDeleteTransaction = async (id: string) => {
    await fetch(`/api/private/transactions/${id}`, { method: "DELETE" });
    reload();
  };

  const handleEditTransaction = async (txn: Transaction) => {
    const title = window.prompt("Edit title", txn.title);
    const amount = window.prompt("Edit amount", String(txn.amount));

    if (!title || !amount) {
      return;
    }

    await fetch(`/api/private/transactions/${txn._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, amount: Number(amount) }),
    });

    reload();
  };

  const handleDeleteBudget = async (id: string) => {
    await fetch(`/api/private/budgets/${id}`, { method: "DELETE" });
    reload();
  };

  const handleEditBudget = async (budget: Budget) => {
    const name = window.prompt("Edit budget name", budget.name);
    const amount = window.prompt("Edit budget amount", String(budget.amount));

    if (!name || !amount) {
      return;
    }

    await fetch(`/api/private/budgets/${budget._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount: Number(amount) }),
    });

    reload();
  };

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading finance workspace...</p>;
  }

  if (error || !data) {
    return <p className="text-sm text-red-400">Failed to load finance data.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
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
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-lg">Add Transaction</h2>
          <form onSubmit={handleCreateTransaction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              value={transactionForm.type}
              onChange={(event) =>
                setTransactionForm((current) => ({ ...current, type: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input
              placeholder="Title"
              value={transactionForm.title}
              onChange={(event) =>
                setTransactionForm((current) => ({ ...current, title: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Amount"
              value={transactionForm.amount}
              onChange={(event) =>
                setTransactionForm((current) => ({ ...current, amount: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={transactionForm.transactionDate}
              onChange={(event) =>
                setTransactionForm((current) => ({ ...current, transactionDate: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            <select
              value={transactionForm.categoryId}
              onChange={(event) =>
                setTransactionForm((current) => ({ ...current, categoryId: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="">No Category</option>
              {data.categories
                .filter((category) => category.type === transactionForm.type)
                .map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <select
              value={transactionForm.recurringFrequency}
              onChange={(event) =>
                setTransactionForm((current) => ({
                  ...current,
                  recurringFrequency: event.target.value,
                }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="monthly">Recurring Monthly</option>
              <option value="yearly">Recurring Yearly</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-[var(--color-muted)] sm:col-span-2">
              <input
                checked={transactionForm.recurringEnabled}
                onChange={(event) =>
                  setTransactionForm((current) => ({
                    ...current,
                    recurringEnabled: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Enable recurring for this transaction
            </label>
            <button
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-contrast)] sm:col-span-2"
              type="submit"
            >
              Save Transaction
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-lg">Add Budget</h2>
          <form onSubmit={handleCreateBudget} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Budget Name"
              value={budgetForm.name}
              onChange={(event) =>
                setBudgetForm((current) => ({ ...current, name: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Amount"
              value={budgetForm.amount}
              onChange={(event) =>
                setBudgetForm((current) => ({ ...current, amount: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            <select
              value={budgetForm.cycle}
              onChange={(event) =>
                setBudgetForm((current) => ({ ...current, cycle: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <select
              value={budgetForm.categoryId}
              onChange={(event) =>
                setBudgetForm((current) => ({ ...current, categoryId: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {data.categories
                .filter((category) => category.type === "expense")
                .map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <input
              type="date"
              value={budgetForm.periodStart}
              onChange={(event) =>
                setBudgetForm((current) => ({ ...current, periodStart: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={budgetForm.periodEnd}
              onChange={(event) =>
                setBudgetForm((current) => ({ ...current, periodEnd: event.target.value }))
              }
              className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />
            <button
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-contrast)] sm:col-span-2"
              type="submit"
            >
              Save Budget
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-lg">Transactions</h2>
          <div className="mt-4 space-y-3">
            {data.transactions.map((txn) => (
              <div key={txn._id} className="rounded-md border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm">{txn.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {txn.type.toUpperCase()} • {new Date(txn.transactionDate).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--color-accent)]">{formatCurrency(txn.amount)}</p>
                </div>
                <div className="mt-2 flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleEditTransaction(txn)}
                    className="rounded border border-[var(--color-border)] px-2 py-1 hover:border-[var(--color-accent)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTransaction(txn._id)}
                    className="rounded border border-red-400/60 px-2 py-1 text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!data.transactions.length ? (
              <p className="text-sm text-[var(--color-muted)]">No transactions in selected range.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h2 className="text-lg">Budgets</h2>
          <div className="mt-4 space-y-3">
            {data.budgets.map((budget) => (
              <div key={budget._id} className="rounded-md border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm">{budget.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {budget.cycle.toUpperCase()} • {new Date(budget.periodStart).toLocaleDateString()} - {" "}
                      {new Date(budget.periodEnd).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--color-accent)]">{formatCurrency(budget.amount)}</p>
                </div>
                <div className="mt-2 flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleEditBudget(budget)}
                    className="rounded border border-[var(--color-border)] px-2 py-1 hover:border-[var(--color-accent)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBudget(budget._id)}
                    className="rounded border border-red-400/60 px-2 py-1 text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!data.budgets.length ? (
              <p className="text-sm text-[var(--color-muted)]">No budgets in selected range.</p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
