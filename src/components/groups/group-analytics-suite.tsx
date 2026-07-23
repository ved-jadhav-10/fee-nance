"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight, Scale, Users } from "lucide-react";

import { useQuery } from "@/lib/use-query";
import { formatCompact, formatCurrency } from "@/lib/format";
import { StatCard } from "@/components/shared/stat-card";
import { ChartFrame, ChartTooltip, axisProps } from "@/components/charts/chart-kit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";

interface GroupOverviewData {
  groups: Array<{
    groupId: string;
    groupName: string;
    memberCount: number;
    totalSpend: number;
    userPaid: number;
    userShare: number;
    netPosition: number;
  }>;
  totalOwedToMe: number;
  totalIOwe: number;
}

/**
 * Diverging bar chart of net position per group. Replaces the previous
 * bespoke Sankey: it reflows on narrow screens, exposes exact values on
 * hover/tap, and the sign is readable from bar direction as well as colour.
 */
function NetPositionChart({ groups }: { groups: GroupOverviewData["groups"] }) {
  const data = React.useMemo(
    () =>
      [...groups]
        .filter((g) => g.netPosition !== 0)
        .sort((a, b) => b.netPosition - a.netPosition)
        .map((g) => ({
          name: g.groupName,
          net: g.netPosition,
        })),
    [groups],
  );

  if (!data.length) {
    return (
      <EmptyState
        icon={Scale}
        title="Everything's settled"
        description="No outstanding balances across your groups right now."
      />
    );
  }

  return (
    <ChartFrame
      height={Math.max(180, data.length * 46 + 40)}
      summary={`Net position across ${data.length} groups. ${data
        .map(
          (d) =>
            `${d.name}: ${d.net >= 0 ? "owed to you" : "you owe"} ${formatCurrency(Math.abs(d.net))}`,
        )
        .join("; ")}.`}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
      >
        <XAxis type="number" {...axisProps} tickFormatter={(v: number) => formatCompact(v)} />
        <YAxis
          type="category"
          dataKey="name"
          {...axisProps}
          width={110}
          tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
        />
        <ReferenceLine x={0} stroke="var(--border)" />
        <RechartsTooltip
          content={
            <ChartTooltip
              valueFormatter={(value) =>
                `${value >= 0 ? "Owed to you " : "You owe "}${formatCurrency(Math.abs(value))}`
              }
            />
          }
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="net" name="Net position" radius={4} maxBarSize={26}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.net >= 0 ? "var(--chart-2)" : "var(--chart-4)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

function GroupBreakdown({ groups }: { groups: GroupOverviewData["groups"] }) {
  const maxSpend = Math.max(...groups.map((g) => g.totalSpend), 1);

  return (
    <ul className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const positive = group.netPosition >= 0;
        const settled = group.netPosition === 0;

        return (
          <li key={group.groupId}>
            <Card className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{group.groupName}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                  </p>
                </div>
                {/* Worded badge — direction never rests on colour alone. */}
                <Badge
                  variant={settled ? "outline" : positive ? "success" : "destructive"}
                  className="shrink-0"
                >
                  {settled ? (
                    "Settled"
                  ) : (
                    <>
                      {positive ? (
                        <ArrowDownLeft aria-hidden="true" />
                      ) : (
                        <ArrowUpRight aria-hidden="true" />
                      )}
                      {formatCompact(Math.abs(group.netPosition))}
                    </>
                  )}
                </Badge>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {settled
                  ? "You're square with this group."
                  : positive
                    ? "Owed to you"
                    : "You owe"}
              </p>

              <Progress
                value={(group.totalSpend / maxSpend) * 100}
                className="mt-4 h-1.5"
                aria-label={`${group.groupName} total spend relative to your largest group`}
              />

              <dl className="mt-3 flex justify-between text-xs text-muted-foreground">
                <div>
                  <dt className="inline">Group total: </dt>
                  <dd className="tabular inline font-medium text-foreground">
                    {formatCompact(group.totalSpend)}
                  </dd>
                </div>
                <div>
                  <dt className="inline">You paid: </dt>
                  <dd className="tabular inline font-medium text-foreground">
                    {formatCompact(group.userPaid)}
                  </dd>
                </div>
              </dl>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export function GroupAnalyticsSuite() {
  const { data, isLoading, error, reload } = useQuery<GroupOverviewData>(
    "/api/private/groups/analytics",
  );

  if (isLoading) {
    return (
      <LoadingRegion label="Loading group balances" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </LoadingRegion>
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Couldn't load group balances"
        description="The analytics request didn't come back. Try again in a moment."
        onRetry={reload}
      />
    );
  }

  if (!data.groups.length) {
    return (
      <EmptyState
        icon={Users}
        title="No group activity yet"
        description="Once you're in a group and expenses start landing, your balances will show up here."
      />
    );
  }

  const net = data.totalOwedToMe - data.totalIOwe;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Owed to you"
          value={data.totalOwedToMe}
          tone="positive"
          icon={ArrowDownLeft}
        />
        <StatCard
          label="You owe"
          value={data.totalIOwe}
          tone="negative"
          icon={ArrowUpRight}
        />
        <StatCard
          label="Net position"
          value={net}
          tone={net >= 0 ? "positive" : "negative"}
          icon={Scale}
          hint={net >= 0 ? "In your favour" : "Owed by you"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Net position by group</CardTitle>
          <CardDescription>
            Bars to the right are owed to you; bars to the left are what you owe.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <NetPositionChart groups={data.groups} />
        </CardContent>
      </Card>

      <GroupBreakdown groups={data.groups} />
    </div>
  );
}
