import {
  ArrowLeftRight,
  ChartPie,
  LayoutDashboard,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the mobile bottom bar, where width is tight. */
  shortLabel?: string;
  icon: LucideIcon;
  description: string;
}

/**
 * Top-level destinations. Capped at 5 — that is the ceiling for a usable
 * bottom navigation bar, and it keeps the sidebar scannable.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: LayoutDashboard,
    description: "Balance, trends and recent activity",
  },
  {
    href: "/finance",
    label: "Transactions",
    shortLabel: "Money",
    icon: ArrowLeftRight,
    description: "Income, expenses, budgets and categories",
  },
  {
    href: "/groups",
    label: "Groups",
    icon: Users,
    description: "Shared expenses and settlements",
  },
  {
    href: "/analytics",
    label: "Analytics",
    shortLabel: "Insights",
    icon: ChartPie,
    description: "Deeper breakdowns and trajectory",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    description: "Account details and preferences",
  },
];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
