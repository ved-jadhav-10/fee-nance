"use client";

import { useState } from "react";
import { useQuery } from "@/components/dashboard/use-query";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  sankeyFlows: Array<{
    groupId: string;
    groupName: string;
    direction: "owed" | "owes";
    amount: number;
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

// ─── Groups Balance Sankey ────────────────────────────────────────────────────
// Bidirectional: left = "YOU OWE" flows; right = "OWED TO YOU" flows
// Centre column = YOU

function GroupBalanceSankey({ data }: { data: GroupOverviewData }) {
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const { sankeyFlows, totalOwedToMe, totalIOwe } = data;

  if (!sankeyFlows.length) {
    return (
      <p className="py-6 text-center text-sm text-[var(--color-text-tertiary)]">
        All balances settled across groups.
      </p>
    );
  }

  const W = 960;
  const H = Math.max(240, sankeyFlows.length * 70 + 80);
  const CW = 26;            // centre bar width
  const CX = W / 2 - CW / 2; // centre bar x (truly centred)
  const BW = 18;            // side bar width
  const LABEL_W = 210;      // reserved width for labels on each side
  const LX = LABEL_W;       // left bar x — text goes from 0..LX-8
  const RX = W - LABEL_W - BW; // right bar x — text goes from RX+BW+8..W
  const TOP = 50;
  const BOTTOM = 20;
  const GAP = 10;

  const owedFlows = sankeyFlows.filter((f) => f.direction === "owed");
  const owesFlows = sankeyFlows.filter((f) => f.direction === "owes");

  const maxSide = Math.max(totalOwedToMe, totalIOwe, 1);
  const innerH = H - TOP - BOTTOM;
  const centreH = innerH;

  // Layout helper: distribute flows vertically with gaps
  function layoutFlows(flows: typeof sankeyFlows, totalAmt: number) {
    const totalGaps = GAP * Math.max(flows.length - 1, 0);
    const usableH = innerH - totalGaps;
    let y = TOP;
    return flows.map((f) => {
      const bh = Math.max((f.amount / maxSide) * usableH, 8);
      const entry = { ...f, y, bh };
      y += bh + GAP;
      return entry;
    });
  }

  const owesLayout = layoutFlows(owesFlows, totalIOwe);
  const owedLayout = layoutFlows(owedFlows, totalOwedToMe);

  // Bezier path from side bar to centre bar
  function makePath(
    sx: number, sy: number, sh: number,    // source bar (side)
    tx: number, ty: number, th: number,    // target (centre slice)
    fromLeft: boolean,
  ) {
    const x1 = fromLeft ? sx + BW : sx;
    const x2 = fromLeft ? CX : CX + CW;
    const cpX = (x1 + x2) / 2;
    return [
      `M ${x1} ${sy}`,
      `C ${cpX} ${sy}, ${cpX} ${ty}, ${x2} ${ty}`,
      `L ${x2} ${ty + th}`,
      `C ${cpX} ${ty + th}, ${cpX} ${sy + sh}, ${x1} ${sy + sh}`,
      "Z",
    ].join(" ");
  }

  // Map centre vertical offsets for each flow
  let leftCentreY = TOP;
  const owesWithCentre = owesLayout.map((f) => {
    const ch = Math.max((f.amount / maxSide) * centreH, 4);
    const entry = { ...f, cy: leftCentreY, ch };
    leftCentreY += ch;
    return entry;
  });

  // Owed segments stack below owes segments in the centre bar (no overlap)
  let rightCentreY = leftCentreY;
  const owedWithCentre = owedLayout.map((f) => {
    const ch = Math.max((f.amount / maxSide) * centreH, 4);
    const entry = { ...f, cy: rightCentreY, ch };
    rightCentreY += ch;
    return entry;
  });

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}>
        {/* Column headers */}
        <text x={LX} y={32} fontSize={11} fill="currentColor" opacity={0.38} letterSpacing="3">YOU OWE</text>
        <text x={CX + CW / 2} y={32} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.55} letterSpacing="2">YOU</text>
        <text x={RX} y={32} fontSize={11} fill="currentColor" opacity={0.38} letterSpacing="3">OWED TO YOU</text>

        {/* Centre bar — split between owes (danger) and owed (success) */}
        {owesWithCentre.map((f, i) => (
          <rect key={`c-owes-${i}`} x={CX} y={f.cy} width={CW} height={f.ch}
            fill="var(--color-danger)" opacity={0.6} />
        ))}
        {owedWithCentre.map((f, i) => (
          <rect key={`c-owed-${i}`} x={CX} y={f.cy} width={CW} height={f.ch}
            fill="var(--color-success)" opacity={0.6} />
        ))}

        {/* "Owes" flows: left bars → centre */}
        {owesWithCentre.map((f, i) => (
          <g
            key={`owes-${i}`}
            style={{ cursor: "crosshair" }}
            onMouseMove={(e) =>
              setTooltip({
                x: e.clientX, y: e.clientY,
                title: f.groupName,
                lines: [
                  { label: "You owe", value: formatCurrency(f.amount), color: "var(--color-danger)" },
                ],
              })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Flow path */}
            <path
              d={makePath(LX, f.y, f.bh, CX, f.cy, f.ch, true)}
              fill="var(--color-danger)" opacity={0.15}
            />
            {/* Side bar */}
            <rect x={LX} y={f.y} width={BW} height={f.bh} fill="var(--color-danger)" opacity={0.6} />
            {/* Label */}
            <text x={LX - 10} y={f.y + f.bh / 2 + 4} textAnchor="end" fontSize={12}
              fill="currentColor" opacity={0.75}>
              {f.groupName.length > 20 ? f.groupName.slice(0, 19) + "…" : f.groupName}
            </text>
            <text x={LX - 10} y={f.y + f.bh / 2 + 18} textAnchor="end" fontSize={11}
              fill="var(--color-danger)" opacity={0.9}>{formatCompact(f.amount)}</text>
          </g>
        ))}

        {/* "Owed" flows: centre → right bars */}
        {owedWithCentre.map((f, i) => (
          <g
            key={`owed-${i}`}
            style={{ cursor: "crosshair" }}
            onMouseMove={(e) =>
              setTooltip({
                x: e.clientX, y: e.clientY,
                title: f.groupName,
                lines: [
                  { label: "Owed to you", value: formatCurrency(f.amount), color: "var(--color-success)" },
                ],
              })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            <path
              d={makePath(RX, f.y, f.bh, CX + CW, f.cy, f.ch, false)}
              fill="var(--color-success)" opacity={0.15}
            />
            <rect x={RX} y={f.y} width={BW} height={f.bh} fill="var(--color-success)" opacity={0.6} />
            <text x={RX + BW + 10} y={f.y + f.bh / 2 + 4} fontSize={12}
              fill="currentColor" opacity={0.75}>
              {f.groupName.length > 20 ? f.groupName.slice(0, 19) + "…" : f.groupName}
            </text>
            <text x={RX + BW + 10} y={f.y + f.bh / 2 + 18} fontSize={11}
              fill="var(--color-success)" opacity={0.9}>{formatCompact(f.amount)}</text>
          </g>
        ))}
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </>
  );
}

// ─── Group Cards ──────────────────────────────────────────────────────────────

function GroupSummaryCards({ groups }: { groups: GroupOverviewData["groups"] }) {
  const maxSpend = Math.max(...groups.map((g) => g.totalSpend), 1);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => {
        const positive = g.netPosition >= 0;
        const barW = (g.totalSpend / maxSpend) * 100;
        return (
          <div
            key={g.groupId}
            className="border border-[var(--color-border)] bg-[var(--layer-2)] p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-medium">{g.groupName}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}
                </p>
              </div>
              <span
                className="shrink-0 px-2 py-0.5 text-sm font-semibold"
                style={{
                  background: positive
                    ? "rgba(var(--success-rgb,34,197,94),0.12)"
                    : "rgba(var(--danger-rgb,239,68,68),0.12)",
                  color: positive ? "var(--color-success)" : "var(--color-danger)",
                }}
              >
                {positive ? "+" : ""}{formatCompact(g.netPosition)}
              </span>
            </div>

            {/* Spend bar */}
            <div className="mt-3 h-1.5 w-full bg-[rgba(255,255,255,0.05)]">
              <div
                className="h-1.5 bg-[var(--color-accent)]"
                style={{ width: `${barW}%`, opacity: 0.5 }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-[var(--color-text-tertiary)]">
              <span>Total: {formatCompact(g.totalSpend)}</span>
              <span>You paid: {formatCompact(g.userPaid)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GroupAnalyticsSuite() {
  const { data, isLoading, error, reload } = useQuery<GroupOverviewData>(
    "/api/private/groups/analytics",
  );

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-[var(--layer-2)]" />
        <div className="h-32 bg-[var(--layer-2)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-[var(--color-border)] p-6 text-center">
        <p className="text-sm text-[var(--color-text-tertiary)]">Could not load group analytics.</p>
        <button onClick={reload} className="mt-3 text-xs text-[var(--color-accent-mid)] underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data.groups.length) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-text-tertiary)]">
        Join or create a group to see analytics here.
      </p>
    );
  }

  const netTotal = data.totalOwedToMe - data.totalIOwe;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Owed to you",
            value: formatCurrency(data.totalOwedToMe),
            color: "var(--color-success)",
          },
          {
            label: "You owe",
            value: formatCurrency(data.totalIOwe),
            color: "var(--color-danger)",
          },
          {
            label: "Net position",
            value: (netTotal >= 0 ? "+" : "") + formatCurrency(netTotal),
            color: netTotal >= 0 ? "var(--color-success)" : "var(--color-danger)",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="border border-[var(--color-border)] bg-[var(--layer-2)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Sankey */}
      <div className="border border-[var(--color-border)] bg-[var(--layer-2)] p-5">
        <div className="mb-4 space-y-1">
          <p className="section-overline">Balance flow</p>
          <h2 className="text-xl font-display">
            Your <span className="display-highlight">split position</span> across groups
          </h2>
        </div>
        <GroupBalanceSankey data={data} />
        <div className="mt-3 flex flex-wrap gap-5 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-tertiary)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 bg-[var(--color-success)]" style={{ opacity: 0.6 }} />
            Owed to you
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 bg-[var(--color-danger)]" style={{ opacity: 0.6 }} />
            You owe
          </span>
        </div>
      </div>

      {/* Group cards */}
      <div className="border border-[var(--color-border)] bg-[var(--layer-2)] p-5">
        <div className="mb-4 space-y-1">
          <p className="section-overline">Per group</p>
          <h2 className="text-xl font-display">
            Group <span className="display-highlight">breakdown</span>
          </h2>
        </div>
        <GroupSummaryCards groups={data.groups} />
      </div>
    </div>
  );
}
