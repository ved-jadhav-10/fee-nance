"use client";

import * as React from "react";
import { AlertCircle, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrency, toDateInput } from "@/lib/format";
import { readApiError } from "@/lib/use-query";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GroupMember } from "./types";

type SplitType = "equal" | "custom" | "percentage";

const SPLIT_LABELS: Record<SplitType, { label: string; hint: string }> = {
  equal: {
    label: "Split equally",
    hint: "Everyone owes the same share.",
  },
  custom: {
    label: "Exact amounts",
    hint: "Assign a rupee amount per person. Must total the expense.",
  },
  percentage: {
    label: "Percentages",
    hint: "Assign a percentage per person. Must total 100%.",
  },
};

/**
 * Live tally for the payer / split grids. The API rejects anything that
 * doesn't balance exactly, so the mismatch is surfaced here before submit
 * rather than as a server error afterwards.
 */
function AllocationSummary({
  assigned,
  target,
  unit,
}: {
  assigned: number;
  target: number;
  unit: "currency" | "percent";
}) {
  const remaining = target - assigned;
  const balanced = Math.abs(remaining) < 0.01;
  const format = (v: number) =>
    unit === "currency" ? formatCurrency(v) : `${v.toFixed(1)}%`;

  return (
    <p
      aria-live="polite"
      className={cn(
        "mt-3 flex items-center gap-1.5 text-xs font-medium",
        balanced ? "text-success" : "text-warning",
      )}
    >
      {balanced ? (
        <Check className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
      )}
      {balanced
        ? `Balanced — ${format(assigned)} assigned.`
        : remaining > 0
          ? `${format(remaining)} still unassigned.`
          : `${format(Math.abs(remaining))} over the total.`}
    </p>
  );
}

/** Grid of per-member numeric inputs, each with a real label. */
function MemberAmountGrid({
  members,
  values,
  onChange,
  idPrefix,
  suffix,
}: {
  members: GroupMember[];
  values: Record<string, string>;
  onChange: (userId: string, value: string) => void;
  idPrefix: string;
  suffix: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {members.map((member) => {
        const id = `${idPrefix}-${member.userId._id}`;
        return (
          <div key={member.userId._id} className="flex flex-col gap-1.5">
            <Label htmlFor={id} className="truncate text-xs font-normal text-muted-foreground">
              {member.userId.name}
            </Label>
            <div className="relative">
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={values[member.userId._id] ?? ""}
                onChange={(e) => onChange(member.userId._id, e.target.value)}
                placeholder="0"
                className="h-10 pr-9 text-sm"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
              >
                {suffix}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ExpenseDialog({
  open,
  onOpenChange,
  groupId,
  members,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  members: GroupMember[];
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [incurredAt, setIncurredAt] = React.useState(toDateInput(new Date()));
  const [splitType, setSplitType] = React.useState<SplitType>("equal");
  const [multiPayer, setMultiPayer] = React.useState(false);
  const [singlePayer, setSinglePayer] = React.useState("");
  const [payerMap, setPayerMap] = React.useState<Record<string, string>>({});
  const [splitMap, setSplitMap] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTitle("");
    setAmount("");
    setNotes("");
    setIncurredAt(toDateInput(new Date()));
    setSplitType("equal");
    setMultiPayer(false);
    setSinglePayer(members[0]?.userId._id ?? "");
    setPayerMap({});
    setSplitMap({});
    setErrors({});
    setSaving(false);
  }, [open, members]);

  const total = Number(amount) || 0;

  const payerAssigned = React.useMemo(
    () =>
      Object.values(payerMap).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [payerMap],
  );

  const splitAssigned = React.useMemo(
    () => Object.values(splitMap).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [splitMap],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "What was this expense for?";
    if (!Number.isFinite(total) || total <= 0) {
      next.amount = "Enter an amount greater than zero.";
    }

    // Build the payer list from whichever mode is active.
    const paidBy = multiPayer
      ? Object.entries(payerMap)
          .map(([userId, value]) => ({ userId, amount: Number(value) || 0 }))
          .filter((entry) => entry.amount > 0)
      : singlePayer
        ? [{ userId: singlePayer, amount: total }]
        : [];

    if (!paidBy.length) {
      next.payers = "Record who actually paid.";
    } else if (multiPayer && Math.abs(payerAssigned - total) >= 0.01) {
      next.payers = `Payer contributions must add up to ${formatCurrency(total)}.`;
    }

    let splits;
    if (splitType !== "equal") {
      const target = splitType === "custom" ? total : 100;
      if (Math.abs(splitAssigned - target) >= 0.01) {
        next.splits =
          splitType === "custom"
            ? `Split amounts must add up to ${formatCurrency(total)}.`
            : "Percentages must add up to 100%.";
      }
      splits = Object.entries(splitMap)
        .map(([userId, value]) =>
          splitType === "custom"
            ? { userId, amount: Number(value) || 0 }
            : { userId, percentage: Number(value) || 0 },
        )
        .filter((entry) =>
          splitType === "custom"
            ? (entry as { amount: number }).amount > 0
            : (entry as { percentage: number }).percentage > 0,
        );
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const response = await fetch(`/api/private/groups/${groupId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        notes: notes.trim() || undefined,
        amount: total,
        splitType,
        paidBy,
        splits,
        incurredAt: `${incurredAt}T00:00:00.000Z`,
      }),
    });
    setSaving(false);

    if (!response.ok) {
      setErrors({
        form: await readApiError(response, "Couldn't save this expense"),
      });
      return;
    }

    toast.success(`"${title.trim()}" added to the group`);
    onOpenChange(false);
    onSaved();
  };

  const perHead = members.length ? total / members.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add group expense</DialogTitle>
          <DialogDescription>
            Log what was spent, who paid, and how it should be divided.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="contents">
          <DialogBody className="space-y-5 py-4">
            <Field label="What for?" htmlFor="expense-title" required error={errors.title}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dinner, cab, groceries…"
                autoComplete="off"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total amount" htmlFor="expense-amount" required error={errors.amount}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Date" htmlFor="expense-date" required>
                <Input
                  type="date"
                  value={incurredAt}
                  onChange={(e) => setIncurredAt(e.target.value)}
                />
              </Field>
            </div>

            {/* ── Who paid ──────────────────────────────────────────── */}
            <fieldset className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="text-sm font-medium">Who paid?</legend>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setMultiPayer((v) => !v)}
                >
                  {multiPayer ? "Just one person paid" : "Several people paid"}
                </Button>
              </div>

              <div className="mt-3">
                {multiPayer ? (
                  <>
                    <MemberAmountGrid
                      members={members}
                      values={payerMap}
                      onChange={(userId, value) =>
                        setPayerMap((c) => ({ ...c, [userId]: value }))
                      }
                      idPrefix="payer"
                      suffix="₹"
                    />
                    <AllocationSummary
                      assigned={payerAssigned}
                      target={total}
                      unit="currency"
                    />
                  </>
                ) : (
                  <Select value={singlePayer} onValueChange={setSinglePayer}>
                    <SelectTrigger aria-label="Who paid">
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.userId._id} value={member.userId._id}>
                          {member.userId.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {errors.payers && (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  {errors.payers}
                </p>
              )}
            </fieldset>

            {/* ── How to split ──────────────────────────────────────── */}
            <fieldset className="rounded-lg border border-border p-4">
              <legend className="text-sm font-medium">How should it split?</legend>

              <div
                role="radiogroup"
                aria-label="Split method"
                className="mt-3 grid gap-1 rounded-lg bg-muted p-1 sm:grid-cols-3"
              >
                {(Object.keys(SPLIT_LABELS) as SplitType[]).map((type) => {
                  const active = splitType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSplitType(type)}
                      className={cn(
                        "h-10 rounded-md px-3 text-sm font-medium transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        active
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {SPLIT_LABELS[type].label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {SPLIT_LABELS[splitType].hint}
              </p>

              {/* Progressive disclosure — the per-member grid only appears
                  when the chosen method actually needs it. */}
              {splitType === "equal" ? (
                <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm">
                  {members.length
                    ? `${formatCurrency(perHead)} each across ${members.length} member${members.length === 1 ? "" : "s"}.`
                    : "No members to split between yet."}
                </p>
              ) : (
                <div className="mt-3">
                  <MemberAmountGrid
                    members={members}
                    values={splitMap}
                    onChange={(userId, value) =>
                      setSplitMap((c) => ({ ...c, [userId]: value }))
                    }
                    idPrefix="split"
                    suffix={splitType === "custom" ? "₹" : "%"}
                  />
                  <AllocationSummary
                    assigned={splitAssigned}
                    target={splitType === "custom" ? total : 100}
                    unit={splitType === "custom" ? "currency" : "percent"}
                  />
                </div>
              )}

              {errors.splits && (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  {errors.splits}
                </p>
              )}
            </fieldset>

            <Field label="Note" htmlFor="expense-notes" hint="Optional context for the group.">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional"
              />
            </Field>

            {errors.form && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-md bg-destructive-subtle px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {errors.form}
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
