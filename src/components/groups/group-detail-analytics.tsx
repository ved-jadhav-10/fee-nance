"use client";

import { useState } from "react";
import { useQuery } from "@/components/dashboard/use-query";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupAnalyticsData {
  groupName: string;
  memberCount: number;
  totalGroupSpend: number;
  spendByMember: Array<{
    memberId: string;
    name: string;
    paid: number;
    owed: number;
    net: number;
  }>;
  spendByMonth: Array<{
    month: string; // "YYYY-MM"
    total: number;
    byMember: Array<{ memberId: string; name: string; amount: number }>;
  }>;
  topExpenses: Array<{
    title: string;
    amount: number;
    splitType: string;
    date: string;
    paidBy: Array<{ name: string; amount: number }>;
  }>;
  splitTypeBreakdown: Array<{ type: string; amount: number }>;
  settlementFlow: Array<{
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    amount: number;
  }>;
  memberNetPositions: Array<{ memberId: string; name: string; net: number }>;
  memberShareOfSpend: Array<{
    memberId: string;
    name: string;
    amount: number;
    percentage: number;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number) {
  if (Math.abs(value) >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)}L`;
  if (Math.abs(value) >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

const MEMBER_COLORS = [
  "#7F77DD", // accent-mid
  "#2a8a6e", // teal
  "#e07b39", // amber
  "#c45c8a", // rose
  "#4a9bd4", // sky
  "#8a7a4a", // bronze
  "#5a9e5a", // green
  "#9a5a9a", // violet
];

const SPLIT_COLORS: Record<string, string> = {
  equal: "#7F77DD",
  custom: "#2a8a6e",
  percentage: "#e07b39",
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipInfo {
  x: number;
  y: number;
  title?: string;
  lines: { label: string; value: string; color?: string }[];
}

function ChartTooltip({ tooltip }: { tooltip: TooltipInfo | null }) {
  if (!tooltip) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: tooltip.x,
        top: tooltip.y,
        zIndex: 9999,
        pointerEvents: "none",
        transform: "translateY(-10%)",
        minWidth: 160,
      }}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2 text-sm shadow-xl"
    >
      {tooltip.title && (
        <p className="mb-1.5 border-b border-[var(--color-border)] pb-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
          {tooltip.title}
        </p>
      )}
      {tooltip.lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          {line.color && (
            <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ background: line.color }} />
          )}
          <span className="text-[var(--color-text-tertiary)]">{line.label}</span>
          <span className="ml-auto pl-3 font-medium text-[var(--color-text)]">{line.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Settlement Sankey ────────────────────────────────────────────────────────
// Who paid whom in settlements. Centre = "SETTLED" label.

function SettlementSankey({
  flows,
  members,
}: {
  flows: GroupAnalyticsData["settlementFlow"];
  members: GroupAnalyticsData["spendByMember"];
}) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  if (!flows.length) {
    return (
      <p className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">
        No settlements recorded yet.
      </p>
    );
  }

  const memberColorMap = new Map(
    members.map((m, i) => [m.memberId, MEMBER_COLORS[i % MEMBER_COLORS.length]]),
  );

  const W = 960;
  const GAP = 10;
  const TOP = 50;
  const BOTTOM = 20;
  const innerH = 260;
  const H = innerH + TOP + BOTTOM;
  const LABEL_W = 200;      // reserved for labels on each side
  const SRC_X = LABEL_W;    // left bar x
  const BW = 20;
  const TGT_X = W - LABEL_W - BW; // right bar x

  // Unique froms and tos
  const fromNames = [...new Set(flows.map((f) => f.fromName))];
  const toNames = [...new Set(flows.map((f) => f.toName))];
  const totalFlow = flows.reduce((s, f) => s + f.amount, 0);

  function layout(names: string[], fromFlows: boolean) {
    const totals = names.map((n) =>
      flows
        .filter((f) => (fromFlows ? f.fromName === n : f.toName === n))
        .reduce((s, f) => s + f.amount, 0),
    );
    const totalGaps = GAP * Math.max(names.length - 1, 0);
    const usableH = innerH - totalGaps;
    let y = TOP;
    return names.map((name, i) => {
      const bh = Math.max((totals[i] / (totalFlow || 1)) * usableH, 8);
      const entry = { name, y, bh };
      y += bh + GAP;
      return entry;
    });
  }

  const fromLayout = layout(fromNames, true);
  const toLayout = layout(toNames, false);
  const fromMap = new Map(fromLayout.map((f) => [f.name, f]));
  const toMap = new Map(toLayout.map((f) => [f.name, f]));

  // Track consumed height per node to stack flows
  const fromConsumed = new Map<string, number>(fromNames.map((n) => [n, 0]));
  const toConsumed = new Map<string, number>(toNames.map((n) => [n, 0]));

  // Per-node totals for proportional flow sizing
  const fromTotals = new Map(
    fromNames.map((n) => [n, flows.filter((f) => f.fromName === n).reduce((s, f) => s + f.amount, 0)]),
  );
  const toTotals = new Map(
    toNames.map((n) => [n, flows.filter((f) => f.toName === n).reduce((s, f) => s + f.amount, 0)]),
  );

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}>
        <text x={SRC_X} y={34} fontSize={11} fill="currentColor" opacity={0.38} letterSpacing="3">PAID BY</text>
        <text x={TGT_X} y={34} fontSize={11} fill="currentColor" opacity={0.38} letterSpacing="3">RECEIVED BY</text>

        {/* Left (from) bars */}
        {fromLayout.map((node) => {
          const memberId = flows.find((f) => f.fromName === node.name)?.fromId ?? "";
          const color = memberColorMap.get(memberId) ?? "#7F77DD";
          return (
            <rect key={node.name} x={SRC_X} y={node.y} width={BW} height={node.bh}
              fill={color} opacity={0.7} />
          );
        })}

        {/* Right (to) bars */}
        {toLayout.map((node) => {
          const memberId = flows.find((f) => f.toName === node.name)?.toId ?? "";
          const color = memberColorMap.get(memberId) ?? "#7F77DD";
          return (
            <rect key={node.name} x={TGT_X} y={node.y} width={BW} height={node.bh}
              fill={color} opacity={0.7} />
          );
        })}

        {/* Flows */}
        {flows.map((flow, i) => {
          const from = fromMap.get(flow.fromName)!;
          const to = toMap.get(flow.toName)!;
          const fh = (flow.amount / (fromTotals.get(flow.fromName) || 1)) * from.bh;
          const th = (flow.amount / (toTotals.get(flow.toName) || 1)) * to.bh;

          const fy = from.y + (fromConsumed.get(flow.fromName) ?? 0);
          const ty = to.y + (toConsumed.get(flow.toName) ?? 0);
          fromConsumed.set(flow.fromName, (fromConsumed.get(flow.fromName) ?? 0) + fh);
          toConsumed.set(flow.toName, (toConsumed.get(flow.toName) ?? 0) + th);

          const x1 = SRC_X + BW;
          const x4 = TGT_X;
          const cpX = (x1 + x4) / 2;
          const color = memberColorMap.get(flow.fromId) ?? "#7F77DD";
          const pathD = [
            `M ${x1} ${fy}`, `C ${cpX} ${fy}, ${cpX} ${ty}, ${x4} ${ty}`,
            `L ${x4} ${ty + th}`, `C ${cpX} ${ty + th}, ${cpX} ${fy + fh}, ${x1} ${fy + fh}`,
            "Z",
          ].join(" ");

          return (
            <g
              key={i}
              style={{ cursor: "crosshair" }}
              onMouseMove={(e) =>
                setTooltip({
                  x: e.clientX, y: e.clientY,
                  title: `${flow.fromName} → ${flow.toName}`,
                  lines: [{ label: "Settled", value: formatCurrency(flow.amount), color }],
                })
              }
              onMouseLeave={() => setTooltip(null)}
            >
              <path d={pathD} fill={color} opacity={0.2} />
            </g>
          );
        })}

        {/* Labels */}
        {fromLayout.map((node) => (
          <text key={node.name} x={SRC_X - 10} y={node.y + node.bh / 2 + 4}
            textAnchor="end" fontSize={12} fill="currentColor" opacity={0.75}>
            {node.name.length > 22 ? node.name.slice(0, 21) + "…" : node.name}
          </text>
        ))}
        {toLayout.map((node) => (
          <text key={node.name} x={TGT_X + BW + 10} y={node.y + node.bh / 2 + 4}
            fontSize={12} fill="currentColor" opacity={0.75}>
            {node.name.length > 22 ? node.name.slice(0, 21) + "…" : node.name}
          </text>
        ))}
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </>
  );
}

// ─── Member Share Donut ────────────────────────────────────────────────────────

function MemberShareDonut({
  shares,
}: {
  shares: GroupAnalyticsData["memberShareOfSpend"];
}) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  if (!shares.length || shares.every((s) => s.amount === 0)) {
    return (
      <p className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">No spend data.</p>
    );
  }

  const R = 80;
  const CX = 110;
  const CY = 110;
  const W = 340;
  const H = 220;
  const total = shares.reduce((s, e) => s + e.amount, 0);

  let angle = -Math.PI / 2;
  type ArcItem = (typeof shares)[number] & { startAngle: number; endAngle: number; color: string };
  const arcs: ArcItem[] = shares
    .filter((s) => s.amount > 0)
    .map((s, i) => {
      const sweep = (s.amount / total) * 2 * Math.PI;
      const entry: ArcItem = { ...s, startAngle: angle, endAngle: angle + sweep, color: MEMBER_COLORS[i % MEMBER_COLORS.length] };
      angle += sweep;
      return entry;
    });

  function arcPath(start: number, end: number, r: number) {
    const x1 = CX + r * Math.cos(start);
    const y1 = CY + r * Math.sin(start);
    const x2 = CX + r * Math.cos(end);
    const y2 = CY + r * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${CX} ${CY} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 220, flexShrink: 0 }}>
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={arcPath(arc.startAngle, arc.endAngle, R)}
            fill={arc.color}
            opacity={0.75}
            style={{ cursor: "crosshair" }}
            onMouseMove={(e) =>
              setTooltip({
                x: e.clientX, y: e.clientY,
                title: arc.name,
                lines: [
                  { label: "Share", value: formatCurrency(arc.amount), color: arc.color },
                  { label: "%", value: `${arc.percentage.toFixed(1)}%` },
                ],
              })
            }
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        {/* Centre hole */}
        <circle cx={CX} cy={CY} r={R * 0.52} fill="var(--layer-2)" />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={13} fill="currentColor" opacity={0.5}>Total</text>
        <text x={CX} y={CY + 13} textAnchor="middle" fontSize={14} fill="currentColor" fontWeight={600}>
          {formatCompact(total)}
        </text>
      </svg>

      {/* Legend */}
      <div className="grid gap-2 text-sm" style={{ gridTemplateColumns: "1fr" }}>
        {arcs.map((arc) => (
          <div key={arc.memberId} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: arc.color }} />
            <span className="text-[var(--color-text-secondary)]">{arc.name}</span>
            <span className="ml-auto pl-4 font-medium text-[var(--color-text)]">
              {arc.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

// ─── Spending Timeline ─────────────────────────────────────────────────────────

function SpendTimeline({
  months,
  members,
}: {
  months: GroupAnalyticsData["spendByMonth"];
  members: GroupAnalyticsData["spendByMember"];
}) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  if (!months.length) {
    return (
      <p className="py-4 text-center text-sm text-[var(--color-text-tertiary)]">No timeline data.</p>
    );
  }

  const W = 560;
  const H = 180;
  const PL = 48;
  const PR = 16;
  const PT = 16;
  const PB = 28;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const memberColorMap = new Map(
    members.map((m, i) => [m.memberId, MEMBER_COLORS[i % MEMBER_COLORS.length]]),
  );

  const allTotals = months.map((m) => m.total);
  const maxVal = Math.max(...allTotals, 1);
  const gridLines = 4;
  const grids = Array.from({ length: gridLines + 1 }, (_, i) => PT + (i / gridLines) * innerH);

  const slotW = innerW / months.length;
  // Total bar per month, stacked per member
  const activeMembers = members.filter((m) =>
    months.some((mo) => mo.byMember.find((bm) => bm.memberId === m.memberId && bm.amount > 0)),
  );

  const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Grid */}
        {grids.map((gy, i) => (
          <g key={i}>
            <line x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} />
            <text x={PL - 6} y={gy + 4} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.4}>
              {formatCompact(maxVal - (i / gridLines) * maxVal)}
            </text>
          </g>
        ))}

        {/* Stacked bars */}
        {months.map((mo, mi) => {
          const bw = slotW * 0.65;
          const bx = PL + mi * slotW + (slotW - bw) / 2;
          const baseY = PT + innerH;
          let stackY = baseY;

          return (
            <g
              key={mo.month}
              style={{ cursor: "crosshair" }}
              onMouseMove={(e) =>
                setTooltip({
                  x: e.clientX, y: e.clientY,
                  title: `${MONTH_ABBR[parseInt(mo.month.split("-")[1]) - 1]} ${mo.month.split("-")[0]}`,
                  lines: [
                    { label: "Total", value: formatCurrency(mo.total) },
                    ...mo.byMember
                      .filter((bm) => bm.amount > 0)
                      .map((bm) => ({
                        label: bm.name,
                        value: formatCurrency(bm.amount),
                        color: memberColorMap.get(bm.memberId),
                      })),
                  ],
                })
              }
              onMouseLeave={() => setTooltip(null)}
            >
              {mo.byMember
                .filter((bm) => bm.amount > 0)
                .map((bm) => {
                  const segH = Math.max((bm.amount / maxVal) * innerH, 2);
                  stackY -= segH;
                  const color = memberColorMap.get(bm.memberId) ?? "#7F77DD";
                  return (
                    <rect key={bm.memberId} x={bx} y={stackY} width={bw} height={segH}
                      fill={color} opacity={0.7} />
                  );
                })}

              {/* Month label */}
              <text
                x={bx + bw / 2} y={baseY + 16}
                textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.45}
              >
                {MONTH_ABBR[parseInt(mo.month.split("-")[1]) - 1]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Member legend */}
      <div className="mt-1 flex flex-wrap gap-4 px-1 text-xs text-[var(--color-text-tertiary)]">
        {activeMembers.map((m) => (
          <span key={m.memberId} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2.5"
              style={{ background: memberColorMap.get(m.memberId), opacity: 0.7 }} />
            {m.name}
          </span>
        ))}
      </div>

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

// ─── Net Position Bar ─────────────────────────────────────────────────────────

function NetPositionBars({ members }: { members: GroupAnalyticsData["memberNetPositions"] }) {
  const maxAbs = Math.max(...members.map((m) => Math.abs(m.net)), 1);

  return (
    <div className="space-y-3">
      {members.map((m, i) => {
        const positive = m.net >= 0;
        const barW = (Math.abs(m.net) / maxAbs) * 100;
        const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
        return (
          <div key={m.memberId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">{m.name}</span>
              <span
                className="font-semibold"
                style={{ color: positive ? "var(--color-success)" : "var(--color-danger)" }}
              >
                {positive ? "+" : ""}{formatCurrency(m.net)}
              </span>
            </div>
            {/* Centered axis bar */}
            <div className="relative flex h-3 items-center bg-[rgba(255,255,255,0.05)]">
              <div className="absolute left-1/2 top-0 h-full w-px bg-[rgba(255,255,255,0.15)]" />
              <div
                className="absolute h-3"
                style={{
                  width: `${barW / 2}%`,
                  background: positive ? "var(--color-success)" : "var(--color-danger)",
                  [positive ? "left" : "right"]: "50%",
                  opacity: 0.65,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Top Expenses Table ───────────────────────────────────────────────────────

function TopExpensesTable({ expenses }: { expenses: GroupAnalyticsData["topExpenses"] }) {
  if (!expenses.length) {
    return <p className="text-sm text-[var(--color-text-tertiary)]">No expenses yet.</p>;
  }
  const max = expenses[0].amount;
  return (
    <div className="space-y-2">
      {expenses.map((e, i) => (
        <div key={i} className="border border-[var(--color-border)] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{e.title}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {e.date} · {e.splitType} split · paid by {e.paidBy.map((p) => p.name).join(", ")}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[var(--color-accent-mid)]">
              {formatCurrency(e.amount)}
            </span>
          </div>
          <div className="mt-2 h-1 bg-[rgba(255,255,255,0.05)]">
            <div
              className="h-1 bg-[var(--color-accent)]"
              style={{ width: `${(e.amount / max) * 100}%`, opacity: 0.5 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Split Type Donut ─────────────────────────────────────────────────────────

function SplitTypeDonut({ data }: { data: GroupAnalyticsData["splitTypeBreakdown"] }) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

  const total = data.reduce((s, d) => s + d.amount, 0);
  if (!total) return <p className="text-sm text-[var(--color-text-tertiary)]">No data.</p>;

  const R = 60;
  const CX = 80;
  const CY = 80;
  let angle = -Math.PI / 2;

  const arcs = data.map((d) => {
    const sweep = (d.amount / total) * 2 * Math.PI;
    const entry = {
      ...d,
      startAngle: angle,
      endAngle: angle + sweep,
      color: SPLIT_COLORS[d.type] ?? "#7F77DD",
    };
    angle += sweep;
    return entry;
  });

  function arcPath(start: number, end: number) {
    const x1 = CX + R * Math.cos(start);
    const y1 = CY + R * Math.sin(start);
    const x2 = CX + R * Math.cos(end);
    const y2 = CY + R * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox={`0 0 160 160`} style={{ width: 140, flexShrink: 0 }}>
        {arcs.map((arc, i) => (
          <path key={i} d={arcPath(arc.startAngle, arc.endAngle)} fill={arc.color} opacity={0.75}
            style={{ cursor: "crosshair" }}
            onMouseMove={(e) =>
              setTooltip({
                x: e.clientX, y: e.clientY,
                title: arc.type.charAt(0).toUpperCase() + arc.type.slice(1),
                lines: [
                  { label: "Amount", value: formatCurrency(arc.amount), color: arc.color },
                  { label: "%", value: `${((arc.amount / total) * 100).toFixed(1)}%` },
                ],
              })
            }
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        <circle cx={CX} cy={CY} r={R * 0.52} fill="var(--layer-2)" />
      </svg>
      <div className="grid gap-2 text-sm">
        {arcs.map((arc) => (
          <div key={arc.type} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5" style={{ background: arc.color }} />
            <span className="capitalize text-[var(--color-text-secondary)]">{arc.type}</span>
            <span className="ml-auto pl-4 text-[var(--color-text)]">
              {((arc.amount / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function GroupDetailAnalytics({ groupId }: { groupId: string }) {
  const { data, isLoading, error, reload } = useQuery<GroupAnalyticsData>(
    `/api/private/groups/${groupId}/analytics`,
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[220, 180, 160].map((h, i) => (
          <div key={i} className="bg-[var(--layer-2)]" style={{ height: h }} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-[var(--color-border)] p-6 text-center">
        <p className="text-sm text-[var(--color-text-tertiary)]">Could not load analytics.</p>
        <button onClick={reload} className="mt-3 text-xs text-[var(--color-accent-mid)] underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total spend", value: formatCurrency(data.totalGroupSpend), color: "var(--color-text)" },
          { label: "Members", value: String(data.memberCount), color: "var(--color-text)" },
          {
            label: "Biggest spender",
            value: [...data.spendByMember].sort((a, b) => b.paid - a.paid)[0]?.name ?? "—",
            color: "var(--color-accent-mid)",
          },
          {
            label: "Largest expense",
            value: data.topExpenses[0] ? formatCurrency(data.topExpenses[0].amount) : "—",
            color: "var(--color-accent-mid)",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="border border-[var(--color-border)] bg-[var(--layer-2)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{kpi.label}</p>
            <p className="mt-1 truncate text-xl font-semibold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Member share donut */}
        <div className="border border-[var(--color-border)] bg-[var(--layer-2)] p-5">
          <div className="mb-4 space-y-1">
            <p className="section-overline">Ownership</p>
            <h3 className="text-lg font-display">
              Share of <span className="display-highlight">group spend</span>
            </h3>
          </div>
          <MemberShareDonut shares={data.memberShareOfSpend} />
        </div>

        {/* Net positions */}
        <div className="border border-[var(--color-border)] bg-[var(--layer-2)] p-5">
          <div className="mb-4 space-y-1">
            <p className="section-overline">Balance</p>
            <h3 className="text-lg font-display">
              Member <span className="display-highlight">net positions</span>
            </h3>
          </div>
          <NetPositionBars members={data.memberNetPositions} />
        </div>
      </div>

      {/* Spending timeline */}
      <div className="border border-[var(--color-border)] bg-[var(--layer-2)] p-5">
        <div className="mb-4 space-y-1">
          <p className="section-overline">Timeline</p>
          <h3 className="text-lg font-display">
            Monthly <span className="display-highlight">spend by member</span>
          </h3>
        </div>
        <SpendTimeline months={data.spendByMonth} members={data.spendByMember} />
      </div>

      {/* Settlement Sankey */}
      <div className="border border-[var(--color-border)] bg-[var(--layer-2)] p-5">
        <div className="mb-4 space-y-1">
          <p className="section-overline">Settlements</p>
          <h3 className="text-lg font-display">
            Payment <span className="display-highlight">flow</span>
          </h3>
        </div>
        <SettlementSankey flows={data.settlementFlow} members={data.spendByMember} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Split type breakdown */}
        <div className="border border-[var(--color-border)] bg-[var(--layer-2)] p-5">
          <div className="mb-4 space-y-1">
            <p className="section-overline">Split method</p>
            <h3 className="text-lg font-display">
              How the group <span className="display-highlight">splits</span>
            </h3>
          </div>
          <SplitTypeDonut data={data.splitTypeBreakdown} />
        </div>

        {/* Top expenses */}
        <div className="border border-[var(--color-border)] bg-[var(--layer-2)] p-5">
          <div className="mb-4 space-y-1">
            <p className="section-overline">Expenses</p>
            <h3 className="text-lg font-display">
              Biggest <span className="display-highlight">expenses</span>
            </h3>
          </div>
          <TopExpensesTable expenses={data.topExpenses} />
        </div>
      </div>
    </div>
  );
}
