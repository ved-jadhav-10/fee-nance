"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { readApiError } from "@/lib/use-query";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Category, MoneyType } from "./types";

/** Fixed swatch set — keeps user-made categories inside the chart palette
 *  so breakdowns stay legible instead of accepting any hex. */
const SWATCHES = [
  "#5b4fcf",
  "#0e9384",
  "#b54708",
  "#9e2a6e",
  "#1570a5",
  "#5d6b83",
];

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(category);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<MoneyType>("expense");
  const [color, setColor] = React.useState(SWATCHES[0]);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setError("");
    setName(category?.name ?? "");
    setType(category?.type ?? "expense");
    setColor(category?.color ?? SWATCHES[0]);
  }, [open, category]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Give the category a name.");
      document.getElementById("category-name")?.focus();
      return;
    }

    setSaving(true);
    const response = await fetch(
      isEdit
        ? `/api/private/categories/${category!._id}`
        : "/api/private/categories",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          // Type is immutable after creation — existing transactions depend on it.
          isEdit
            ? { name: name.trim(), color }
            : { name: name.trim(), type, color },
        ),
      },
    );
    setSaving(false);

    if (!response.ok) {
      toast.error(await readApiError(response, "Couldn't save the category"));
      return;
    }

    toast.success(isEdit ? "Category updated" : "Category created");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            Categories drive your spending breakdowns and budget scoping.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="contents">
          <DialogBody className="space-y-4 py-4">
            <Field
              label="Name"
              htmlFor="category-name"
              required
              error={error || undefined}
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Transport, Freelance…"
                autoComplete="off"
              />
            </Field>

            <Field
              label="Applies to"
              htmlFor="category-type"
              hint={
                isEdit
                  ? "Type can't change once transactions reference this category."
                  : "Determines where this category appears."
              }
            >
              <Select
                value={type}
                onValueChange={(v) => setType(v as MoneyType)}
                disabled={isEdit}
              >
                <SelectTrigger id="category-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-2">
              <Label htmlFor="category-color-group">Colour</Label>
              <div
                id="category-color-group"
                role="radiogroup"
                aria-label="Category colour"
                className="flex flex-wrap gap-2"
              >
                {SWATCHES.map((swatch) => {
                  const active = color === swatch;
                  return (
                    <button
                      key={swatch}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={`Colour ${swatch}`}
                      onClick={() => setColor(swatch)}
                      // size-11 keeps the tap area at 44px even though the
                      // swatch itself is smaller.
                      className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span
                        className={cn(
                          "size-7 rounded-full transition-all",
                          active &&
                            "ring-2 ring-foreground ring-offset-2 ring-offset-popover",
                        )}
                        style={{ background: swatch }}
                      />
                    </button>
                  );
                })}
              </div>
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
              {isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
