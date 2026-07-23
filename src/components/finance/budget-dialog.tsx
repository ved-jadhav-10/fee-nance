"use client";

import * as React from "react";

import { toDateInput } from "@/lib/format";
import { readApiError } from "@/lib/use-query";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
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
import type { Budget, Category } from "./types";

type Cycle = "monthly" | "quarterly" | "yearly";

interface FormState {
  name: string;
  amount: string;
  cycle: Cycle;
  categoryId: string;
  periodStart: string;
  periodEnd: string;
}

/** End of the period that starts at `from`, for the given cycle. */
function periodEndFor(from: string, cycle: Cycle) {
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return from;

  const end = new Date(start);
  if (cycle === "monthly") end.setMonth(end.getMonth() + 1);
  else if (cycle === "quarterly") end.setMonth(end.getMonth() + 3);
  else end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);

  return toDateInput(end);
}

function emptyForm(): FormState {
  const start = toDateInput(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  return {
    name: "",
    amount: "",
    cycle: "monthly",
    categoryId: "",
    periodStart: start,
    periodEnd: periodEndFor(start, "monthly"),
  };
}

export function BudgetDialog({
  open,
  onOpenChange,
  categories,
  budget,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  budget?: Budget | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(budget);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      budget
        ? {
            name: budget.name,
            amount: String(budget.amount),
            cycle: budget.cycle,
            categoryId: budget.categoryId ?? "",
            periodStart: toDateInput(new Date(budget.periodStart)),
            periodEnd: toDateInput(new Date(budget.periodEnd)),
          }
        : emptyForm(),
    );
  }, [open, budget]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name this budget.";
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      next.amount = "Enter a limit greater than zero.";
    }
    if (new Date(form.periodEnd) < new Date(form.periodStart)) {
      next.periodEnd = "The end date must fall after the start date.";
    }
    setErrors(next);

    if (Object.keys(next).length) {
      document.getElementById(`budget-${Object.keys(next)[0]}`)?.focus();
      return;
    }

    setSaving(true);
    const response = await fetch(
      isEdit ? `/api/private/budgets/${budget!._id}` : "/api/private/budgets",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          cycle: form.cycle,
          categoryId: form.categoryId || undefined,
          periodStart: `${form.periodStart}T00:00:00.000Z`,
          periodEnd: `${form.periodEnd}T23:59:59.999Z`,
        }),
      },
    );
    setSaving(false);

    if (!response.ok) {
      toast.error(await readApiError(response, "Couldn't save the budget"));
      return;
    }

    toast.success(isEdit ? "Budget updated" : "Budget created");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit budget" : "New budget"}</DialogTitle>
          <DialogDescription>
            Set a spending ceiling for a period, optionally scoped to one category.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="contents">
          <DialogBody className="space-y-4 py-4">
            <Field label="Name" htmlFor="budget-name" required error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Monthly essentials"
                autoComplete="off"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Limit"
                htmlFor="budget-amount"
                required
                error={errors.amount}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step={0.01}
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Cycle" htmlFor="budget-cycle">
                <Select
                  value={form.cycle}
                  onValueChange={(v) => {
                    const cycle = v as Cycle;
                    setForm((c) => ({
                      ...c,
                      cycle,
                      periodEnd: periodEndFor(c.periodStart, cycle),
                    }));
                  }}
                >
                  <SelectTrigger id="budget-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              label="Category"
              htmlFor="budget-category"
              hint="Leave unset to cap total spending across all categories."
            >
              <Select
                value={form.categoryId || "all"}
                onValueChange={(v) => set("categoryId", v === "all" ? "" : v)}
              >
                <SelectTrigger id="budget-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" htmlFor="budget-periodStart" required>
                <Input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) =>
                    setForm((c) => ({
                      ...c,
                      periodStart: e.target.value,
                      periodEnd: periodEndFor(e.target.value, c.cycle),
                    }))
                  }
                />
              </Field>

              <Field
                label="Ends"
                htmlFor="budget-periodEnd"
                required
                error={errors.periodEnd}
              >
                <Input
                  type="date"
                  min={form.periodStart}
                  value={form.periodEnd}
                  onChange={(e) => set("periodEnd", e.target.value)}
                />
              </Field>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? "Save changes" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
