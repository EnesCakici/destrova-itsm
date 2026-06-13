/** Sentinel for "no filter" — locale-independent. */
export const FILTER_ALL = "All";

export const MANAGER_STATUS_CODES = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export const MANAGER_PRIORITY_CODES = ["HIGH", "MEDIUM", "LOW"];

export const MANAGER_SLA_CODES = ["safe", "atRisk", "breached", "paused"];

export const DASHBOARD_ALL_PRODUCTS = FILTER_ALL;
export const DASHBOARD_ALL_PRIORITIES = FILTER_ALL;
export const DASHBOARD_ALL_STATUSES = FILTER_ALL;

export const DASHBOARD_PRIORITY_OPTIONS = [FILTER_ALL, ...MANAGER_PRIORITY_CODES];
export const DASHBOARD_STATUS_OPTIONS = [FILTER_ALL, ...MANAGER_STATUS_CODES];

export const MANAGER_TICKET_FILTER_OPTIONS = {
  status: [FILTER_ALL, ...MANAGER_STATUS_CODES],
  priority: [FILTER_ALL, ...MANAGER_PRIORITY_CODES],
  sla: [FILTER_ALL, ...MANAGER_SLA_CODES],
};

/** @param {string} [raw] */
export function normalizeManagerPriorityCode(raw) {
  if (raw == null || raw === "") return "MEDIUM";
  const s = String(raw).trim();
  if (s === "High" || s === "HIGH") return "HIGH";
  if (s === "Medium" || s === "MEDIUM") return "MEDIUM";
  if (s === "Low" || s === "LOW") return "LOW";
  const u = s.toUpperCase();
  if (u === "HIGH" || u === "HIGH_PRIORITY") return "HIGH";
  if (u === "MEDIUM" || u === "MEDIUM_PRIORITY") return "MEDIUM";
  if (u === "LOW" || u === "LOW_PRIORITY") return "LOW";
  return "MEDIUM";
}

/** @param {string} [raw] */
export function normalizeManagerStatusCode(raw) {
  if (raw == null || raw === "") return "NEW";
  const s = String(raw).trim();
  const map = {
    New: "NEW",
    "In Progress": "IN_PROGRESS",
    "Waiting for Customer": "WAITING_FOR_CUSTOMER",
    Resolved: "RESOLVED",
    Closed: "CLOSED",
  };
  if (map[s]) return map[s];
  const u = s.toUpperCase().replace(/[\s-]+/g, "_");
  if (MANAGER_STATUS_CODES.includes(u)) return u;
  return u || "NEW";
}

export function isClosedStatusCode(code) {
  const c = normalizeManagerStatusCode(code);
  return c === "CLOSED" || c === "RESOLVED";
}
