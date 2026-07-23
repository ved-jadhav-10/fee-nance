"use client";

import * as React from "react";
import { AlertCircle, ArrowRight } from "lucide-react";

import { formatCurrency } from "@/lib/format";
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
import type { GroupMember } from "./types";

export interface SettlementPrefill {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export function SettlementDialog({
  open,
  onOpenChange,
  groupId,
  members,
  prefill,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  members: GroupMember[];
  /** Set when opened from a "settle this" row, so the form arrives filled in. */
  prefill?: SettlementPrefill | null;
  onSaved: () => void;
}) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setFrom(prefill?.fromUserId ?? members[0]?.userId._id ?? "");
    setTo(prefill?.toUserId ?? members[1]?.userId._id ?? "");
    setAmount(prefill ? String(prefill.amount.toFixed(2)) : "");
    setNote("");
    setErrors({});
  }, [open, prefill, members]);

  const nameOf = (id: string) =>
    members.find((m) => m.userId._id === id)?.userId.name ?? "Someone";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next: Record<string, string> = {};
    if (!from || !to) next.to = "Pick both people.";
    else if (from === to) next.to = "Payer and recipient must be different people.";

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      next.amount = "Enter an amount greater than zero.";
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const response = await fetch(`/api/private/groups/${groupId}/settlements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromUserId: from,
        toUserId: to,
        amount: value,
        note: note.trim() || undefined,
      }),
    });
    setSaving(false);

    if (!response.ok) {
      setErrors({
        form: await readApiError(response, "Couldn't record this settlement"),
      });
      return;
    }

    toast.success(
      `${nameOf(from)} → ${nameOf(to)}: ${formatCurrency(value)} recorded`,
    );
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a settlement</DialogTitle>
          <DialogDescription>
            Log a payment made between members to bring balances back down.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="contents">
          <DialogBody className="space-y-4 py-4">
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <Field label="Paid by" htmlFor="settle-from">
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger id="settle-from">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.userId._id} value={member.userId._id}>
                        {member.userId.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <ArrowRight
                className="mb-3 hidden size-4 shrink-0 text-muted-foreground sm:block"
                aria-hidden="true"
              />

              <Field label="Paid to" htmlFor="settle-to" error={errors.to}>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger id="settle-to">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.userId._id} value={member.userId._id}>
                        {member.userId.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Amount" htmlFor="settle-amount" required error={errors.amount}>
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

            <Field label="Note" htmlFor="settle-note" hint="Optional — e.g. how it was paid.">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="UPI, cash…"
                autoComplete="off"
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
              Record settlement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
