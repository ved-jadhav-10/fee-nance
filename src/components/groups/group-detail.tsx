"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@/components/dashboard/use-query";

type Member = {
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  role: "owner" | "member";
};

interface GroupPayload {
  group: {
    _id: string;
    name: string;
    inviteCode: string;
    members: Member[];
  };
}

interface GroupDetailProps {
  groupId: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function GroupDetail({ groupId }: GroupDetailProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom" | "percentage">("equal");
  const [note, setNote] = useState("");
  const [incurredAt, setIncurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [payerMap, setPayerMap] = useState<Record<string, string>>({});
  const [splitMap, setSplitMap] = useState<Record<string, string>>({});

  const [settlementForm, setSettlementForm] = useState({
    fromUserId: "",
    toUserId: "",
    amount: "",
    note: "",
  });

  const groupQuery = useQuery<GroupPayload>(`/api/private/groups/${groupId}`);
  const expensesQuery = useQuery<{ expenses: Array<{ _id: string; title: string; amount: number; splitType: string; incurredAt: string }> }>(
    `/api/private/groups/${groupId}/expenses`,
  );
  const balancesQuery = useQuery<{
    balances: Array<{ memberId: string; netAmount: number }>;
    pairwiseSettlements: Array<{ fromUserId: string; toUserId: string; amount: number }>;
  }>(`/api/private/groups/${groupId}/balances`);
  const settlementsQuery = useQuery<{
    settlements: Array<{ _id: string; fromUserId: string; toUserId: string; amount: number; settledAt: string }>;
  }>(`/api/private/groups/${groupId}/settlements`);

  const groupMembers = groupQuery.data?.group.members;
  const members = useMemo(() => groupMembers ?? [], [groupMembers]);
  const defaultFromUserId = members[0]?.userId._id ?? "";
  const defaultToUserId = members[1]?.userId._id ?? members[0]?.userId._id ?? "";

  const memberNameMap = useMemo(
    () => new Map(members.map((member) => [member.userId._id, member.userId.name])),
    [members],
  );

  const refreshAll = () => {
    groupQuery.reload();
    expensesQuery.reload();
    balancesQuery.reload();
    settlementsQuery.reload();
  };

  const handleCreateExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const total = Number(amount);
    const fallbackPayer = members[0]?.userId._id;

    const payerSource =
      Object.keys(payerMap).length > 0
        ? payerMap
        : fallbackPayer
          ? { [fallbackPayer]: amount || "0" }
          : {};

    const paidBy = Object.entries(payerSource)
      .map(([userId, value]) => ({ userId, amount: Number(value) }))
      .filter((entry) => entry.amount > 0);

    const splits =
      splitType === "equal"
        ? undefined
        : Object.entries(splitMap)
            .map(([userId, value]) =>
              splitType === "custom"
                ? { userId, amount: Number(value) }
                : { userId, percentage: Number(value) },
            )
            .filter((entry) => {
              if (splitType === "custom") {
                return (entry as { amount?: number }).amount && (entry as { amount: number }).amount > 0;
              }
              return (entry as { percentage?: number }).percentage && (entry as { percentage: number }).percentage > 0;
            });

    await fetch(`/api/private/groups/${groupId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        notes: note || undefined,
        amount: total,
        splitType,
        paidBy,
        splits,
        incurredAt: `${incurredAt}T00:00:00.000Z`,
      }),
    });

    setTitle("");
    setAmount("");
    setNote("");
    setSplitType("equal");
    refreshAll();
  };

  const handleCreateSettlement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await fetch(`/api/private/groups/${groupId}/settlements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromUserId: settlementForm.fromUserId || defaultFromUserId,
        toUserId: settlementForm.toUserId || defaultToUserId,
        amount: Number(settlementForm.amount),
        note: settlementForm.note || undefined,
      }),
    });

    setSettlementForm((current) => ({ ...current, amount: "", note: "" }));
    refreshAll();
  };

  if (groupQuery.isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading group workspace...</p>;
  }

  if (groupQuery.error || !groupQuery.data) {
    return <p className="text-sm text-red-400">Failed to load group details.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl">{groupQuery.data.group.name}</h2>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Invite Code: {groupQuery.data.group.inviteCode}
            </p>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)] hover:border-[var(--color-accent)]"
          >
            Refresh
          </button>
        </div>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Members: {members.map((member) => member.userId.name).join(", ")}
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h3 className="text-lg">Add Group Expense</h3>
          <form className="mt-4 space-y-3" onSubmit={handleCreateExpense}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Expense title"
                className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                required
              />
              <input
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Amount"
                className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                required
              />
              <select
                value={splitType}
                onChange={(event) =>
                  setSplitType(event.target.value as "equal" | "custom" | "percentage")
                }
                className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              >
                <option value="equal">Equal Split</option>
                <option value="custom">Custom Amount Split</option>
                <option value="percentage">Percentage Split</option>
              </select>
              <input
                type="date"
                value={incurredAt}
                onChange={(event) => setIncurredAt(event.target.value)}
                className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              />
            </div>

            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note (optional)"
              className="w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
            />

            <div className="rounded-md border border-[var(--color-border)] p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Payer Contributions</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {members.map((member) => (
                  <label key={member.userId._id} className="flex items-center gap-2 text-sm">
                    <span className="w-24 text-[var(--color-muted)]">{member.userId.name}</span>
                    <input
                      type="number"
                      value={
                        payerMap[member.userId._id] ??
                        (member.userId._id === members[0]?.userId._id ? amount || "0" : "0")
                      }
                      onChange={(event) =>
                        setPayerMap((current) => ({
                          ...current,
                          [member.userId._id]: event.target.value,
                        }))
                      }
                      className="flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>

            {splitType !== "equal" ? (
              <div className="rounded-md border border-[var(--color-border)] p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {splitType === "custom" ? "Custom Amount Split" : "Percentage Split"}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {members.map((member) => (
                    <label key={member.userId._id} className="flex items-center gap-2 text-sm">
                      <span className="w-24 text-[var(--color-muted)]">{member.userId.name}</span>
                      <input
                        type="number"
                        value={splitMap[member.userId._id] ?? "0"}
                        onChange={(event) =>
                          setSplitMap((current) => ({
                            ...current,
                            [member.userId._id]: event.target.value,
                          }))
                        }
                        className="flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-contrast)]"
            >
              Save Expense
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h3 className="text-lg">Manual Settlement</h3>
          <form className="mt-4 space-y-3" onSubmit={handleCreateSettlement}>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={settlementForm.fromUserId || defaultFromUserId}
                onChange={(event) =>
                  setSettlementForm((current) => ({ ...current, fromUserId: event.target.value }))
                }
                className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              >
                {members.map((member) => (
                  <option key={member.userId._id} value={member.userId._id}>
                    {member.userId.name} pays
                  </option>
                ))}
              </select>

              <select
                value={settlementForm.toUserId || defaultToUserId}
                onChange={(event) =>
                  setSettlementForm((current) => ({ ...current, toUserId: event.target.value }))
                }
                className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              >
                {members.map((member) => (
                  <option key={member.userId._id} value={member.userId._id}>
                    {member.userId.name} receives
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Amount"
                value={settlementForm.amount}
                onChange={(event) =>
                  setSettlementForm((current) => ({ ...current, amount: event.target.value }))
                }
                className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
                required
              />

              <input
                placeholder="Note"
                value={settlementForm.note}
                onChange={(event) =>
                  setSettlementForm((current) => ({ ...current, note: event.target.value }))
                }
                className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold hover:border-[var(--color-accent)]"
            >
              Record Settlement
            </button>
          </form>

          <div className="mt-6 space-y-2">
            <h4 className="text-sm uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Member Net Amounts
            </h4>
            {balancesQuery.data?.balances?.length ? (
              balancesQuery.data.balances.map((entry) => {
                const memberName = memberNameMap.get(entry.memberId) ?? entry.memberId;
                const descriptor =
                  entry.netAmount > 0
                    ? "gets"
                    : entry.netAmount < 0
                      ? "owes"
                      : "settled";

                return (
                  <p key={entry.memberId} className="text-sm">
                    {memberName}: {descriptor} {formatCurrency(Math.abs(entry.netAmount))}
                  </p>
                );
              })
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No net balances yet.</p>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <h4 className="text-sm uppercase tracking-[0.16em] text-[var(--color-muted)]">Pairwise Balances</h4>
            {balancesQuery.data?.pairwiseSettlements?.length ? (
              balancesQuery.data.pairwiseSettlements.map((item, index) => (
                <p key={`${item.fromUserId}-${item.toUserId}-${index}`} className="text-sm">
                  {memberNameMap.get(item.fromUserId) ?? item.fromUserId} pays {" "}
                  {memberNameMap.get(item.toUserId) ?? item.toUserId}: {formatCurrency(item.amount)}
                </p>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No balances to settle.</p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h3 className="text-lg">Expenses</h3>
          <div className="mt-3 space-y-2">
            {expensesQuery.data?.expenses?.length ? (
              expensesQuery.data.expenses.map((expense) => (
                <div key={expense._id} className="rounded-md border border-[var(--color-border)] p-3">
                  <p className="text-sm">{expense.title}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {expense.splitType.toUpperCase()} • {new Date(expense.incurredAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-accent)]">{formatCurrency(expense.amount)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No expenses yet.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5">
          <h3 className="text-lg">Settlement History</h3>
          <div className="mt-3 space-y-2">
            {settlementsQuery.data?.settlements?.length ? (
              settlementsQuery.data.settlements.map((settlement) => (
                <div key={settlement._id} className="rounded-md border border-[var(--color-border)] p-3 text-sm">
                  <p>
                    {memberNameMap.get(settlement.fromUserId) ?? settlement.fromUserId} paid {" "}
                    {memberNameMap.get(settlement.toUserId) ?? settlement.toUserId}
                  </p>
                  <p className="text-[var(--color-accent)]">{formatCurrency(settlement.amount)}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {new Date(settlement.settledAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--color-muted)]">No settlements recorded.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
