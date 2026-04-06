export const dashboardRangeValues = ["thisMonth", "last30Days", "thisYear"] as const;

export type DashboardDefaultRange = (typeof dashboardRangeValues)[number];

export interface UserPreferences {
  currency: "INR";
  dashboardDefaultRange: DashboardDefaultRange;
}

export const defaultUserPreferences: UserPreferences = {
  currency: "INR",
  dashboardDefaultRange: "thisMonth",
};

export const dashboardRangeLabel: Record<DashboardDefaultRange, string> = {
  thisMonth: "This month",
  last30Days: "Last 30 days",
  thisYear: "This year",
};
