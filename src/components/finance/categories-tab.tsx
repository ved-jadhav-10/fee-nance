"use client";

import * as React from "react";
import { Lock, Pencil, Tags, Trash2 } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Tooltip } from "@/components/ui/misc";
import { SectionHeader } from "@/components/layout/page-header";
import type { Category, Transaction } from "./types";

function CategoryRow({
  category,
  total,
  count,
  onEdit,
  onDelete,
}: {
  category: Category;
  total: number;
  count: number;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: category.color ?? "var(--muted-foreground)" }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{category.name}</span>
          {category.isSystem && (
            <Tooltip content="Built-in category — can't be edited or removed">
              <span className="text-muted-foreground">
                <Lock className="size-3" />
                <span className="sr-only">Built-in</span>
              </span>
            </Tooltip>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {count === 0
            ? "Unused in this period"
            : `${count} transaction${count === 1 ? "" : "s"} · ${formatCurrency(total)}`}
        </p>
      </div>

      {!category.isSystem && onEdit && onDelete && (
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground"
            onClick={() => onEdit(category)}
            aria-label={`Edit ${category.name}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(category)}
            aria-label={`Delete ${category.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </li>
  );
}

export function CategoriesTab({
  categories,
  transactions,
  onCreate,
  onEdit,
  onDelete,
}: {
  categories: Category[];
  transactions: Transaction[];
  onCreate: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  // Usage stats give each category a reason to exist on screen.
  const usage = React.useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const txn of transactions) {
      if (!txn.categoryId) continue;
      const current = map.get(txn.categoryId) ?? { total: 0, count: 0 };
      current.total += txn.amount;
      current.count += 1;
      map.set(txn.categoryId, current);
    }
    return map;
  }, [transactions]);

  const groups = [
    {
      key: "expense" as const,
      title: "Expense categories",
      description: "Used to break down where your money goes.",
    },
    {
      key: "income" as const,
      title: "Income categories",
      description: "Used to attribute money coming in.",
    },
  ];

  if (!categories.length) {
    return (
      <EmptyState
        icon={Tags}
        title="No categories yet"
        description="Categories turn a flat list of transactions into a breakdown you can act on."
        action={
          <Button size="sm" onClick={onCreate}>
            Create category
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const items = categories.filter((c) => c.type === group.key);
        const custom = items.filter((c) => !c.isSystem).length;

        return (
          <section key={group.key} className="space-y-3">
            <SectionHeader
              title={group.title}
              description={group.description}
              action={
                <Badge variant="outline">
                  {items.length} total · {custom} custom
                </Badge>
              }
            />

            {items.length ? (
              <Card className="overflow-hidden">
                <ul>
                  {items.map((category) => {
                    const stats = usage.get(category._id);
                    return (
                      <CategoryRow
                        key={category._id}
                        category={category}
                        total={stats?.total ?? 0}
                        count={stats?.count ?? 0}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    );
                  })}
                </ul>
              </Card>
            ) : (
              <EmptyState
                title={`No ${group.key} categories`}
                description="Add one to start grouping these transactions."
                action={
                  <Button variant="outline" size="sm" onClick={onCreate}>
                    Create category
                  </Button>
                }
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
