/** Date range presets for the Manager Reports page. */
export const MANAGER_REPORT_RANGE_IDS = ["7d", "30d", "90d", "qtr", "ytd", "custom"];

export const MANAGER_REPORT_RANGES = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days", default: true },
  { id: "90d", label: "Last 90 days" },
  { id: "qtr", label: "This quarter" },
  { id: "ytd", label: "Year to date" },
  { id: "custom", label: "Custom range" },
];

export const DEFAULT_MANAGER_REPORT_RANGE =
  MANAGER_REPORT_RANGES.find((r) => r.default)?.id || "30d";
