import {
  FILTER_ALL,
  MANAGER_PRIORITY_CODES,
  MANAGER_SLA_CODES,
  MANAGER_STATUS_CODES,
} from "./managerFilterCodes";

function statusCommonKey(code) {
  if (code === "IN_PROGRESS") return "inProgress";
  if (code === "WAITING_FOR_CUSTOMER") return "waitingForCustomer";
  return String(code).toLowerCase();
}

/** @param {string} code @param {(key: string) => string} tc common namespace */
export function translateManagerStatusCode(code, tc) {
  return tc(`status.${statusCommonKey(code)}`);
}

/** @param {string} code @param {(key: string) => string} tc */
export function translateManagerPriorityCode(code, tc) {
  return tc(`priority.${String(code).toLowerCase()}`);
}

/** @param {string} code @param {(key: string) => string} tm manager namespace */
export function translateManagerSlaCode(code, tm) {
  const key = String(code);
  if (key === "atRisk") return tm("sla.atRisk");
  if (key === "breached") return tm("sla.breached");
  if (key === "paused") return tm("sla.paused");
  if (key === "safe") return tm("sla.safe");
  return key;
}

/** @param {string} value @param {(key: string) => string} tm */
export function translateManagerStatusFilterValue(value, tm, tc) {
  if (value === FILTER_ALL) return tm("filters.allStatuses");
  return translateManagerStatusCode(value, tc);
}

/** @param {string} value @param {(key: string) => string} tm @param {(key: string) => string} tc */
export function translateManagerPriorityFilterValue(value, tm, tc) {
  if (value === FILTER_ALL) return tm("filters.allPriorities");
  return translateManagerPriorityCode(value, tc);
}

/** @param {string} value @param {(key: string) => string} tm */
export function translateManagerSlaFilterValue(value, tm) {
  if (value === FILTER_ALL) return tm("filters.allSla");
  return translateManagerSlaCode(value, tm);
}

/** @param {string} value @param {(key: string) => string} tm */
export function translateManagerProductFilterValue(value, tm) {
  if (value === FILTER_ALL) return tm("filters.allProducts");
  return value;
}

/** @param {string[]} values @param {(v: string) => string} labelFor */
export function toFilterSelectOptions(values, labelFor) {
  return (values ?? []).map((value) => ({ value, label: labelFor(value) }));
}

export function buildStatusFilterOptions(tm, tc) {
  return toFilterSelectOptions(
    [FILTER_ALL, ...MANAGER_STATUS_CODES],
    (v) => translateManagerStatusFilterValue(v, tm, tc),
  );
}

export function buildPriorityFilterOptions(tm, tc) {
  return toFilterSelectOptions(
    [FILTER_ALL, ...MANAGER_PRIORITY_CODES],
    (v) => translateManagerPriorityFilterValue(v, tm, tc),
  );
}

export function buildSlaFilterOptions(tm) {
  return toFilterSelectOptions([FILTER_ALL, ...MANAGER_SLA_CODES], (v) =>
    translateManagerSlaFilterValue(v, tm),
  );
}

export function buildProductFilterOptions(productNames, tm) {
  const names = Array.isArray(productNames) ? productNames.filter((n) => n !== FILTER_ALL) : [];
  return toFilterSelectOptions(
    [FILTER_ALL, ...names],
    (v) => translateManagerProductFilterValue(v, tm),
  );
}

/** @param {string} rangeId @param {(key: string) => string} tm */
export function translateDashboardRangeId(rangeId, tm) {
  const id = String(rangeId ?? "");
  if (id === "today") return tm("dashboard.ranges.today");
  if (id === "7d") return tm("dashboard.ranges.7d");
  if (id === "30d") return tm("dashboard.ranges.30d");
  return id;
}

/** @param {{ labelKey?: string, label?: string }} preset @param {(key: string) => string} tm */
export function translateDashboardPresetLabel(preset, tm) {
  if (!preset) return "";
  if (preset.labelKey) return tm(preset.labelKey);
  return preset.label ?? "";
}
