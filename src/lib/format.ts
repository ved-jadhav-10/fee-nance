/**
 * Locale-aware formatting helpers. Everything user-facing goes through here
 * so numbers, dates and currency read consistently across every screen.
 */

const LOCALE = "en-IN";
const CURRENCY = "INR";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

const currencyWholeFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number, { whole = false } = {}) {
  return (whole ? currencyWholeFormatter : currencyFormatter).format(value);
}

/** Indian-numbering compact form: ₹1.2L, ₹3.4Cr. Use on axes and chips. */
export function formatCompact(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatDate(
  value: string | number | Date,
  style: "short" | "medium" | "long" = "medium",
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: style === "short" ? "short" : style === "long" ? "long" : "short",
    year: style === "short" ? undefined : "numeric",
  }).format(date);
}

/** "3 days ago" / "in 2 months" — for activity feeds and last-updated stamps. */
export function formatRelative(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const diffMs = date.getTime() - Date.now();
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return "just now";
}

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function monthLabel(month: number, year?: number) {
  const name = MONTH_NAMES[month - 1] ?? "—";
  return year ? `${name} ${String(year).slice(2)}` : name;
}

/** ISO yyyy-mm-dd, for <input type="date"> round-tripping. */
export function toDateInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "?";
  return parts.map((p) => p[0]!).join("").toUpperCase();
}
