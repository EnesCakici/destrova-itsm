import { formatClosureReasonI18n } from "../../shared/constants/closureReasons";
import { translateManagerPriorityFilterValue, translateManagerProductFilterValue, translateManagerStatusFilterValue } from "./managerFilterI18n";
import { FILTER_ALL } from "./managerFilterCodes";

const STATUS_EN_TO_KEY = {
  New: "new",
  "In progress": "inProgress",
  "In Progress": "inProgress",
  "Waiting for Customer": "waitingForCustomer",
  Resolved: "resolved",
  Closed: "closed",
};

/** @param {string} due @param {(key: string, opts?: object) => string} tm */
export function formatManagerSlaDueLabel(due, tm) {
  if (!due || due === "—") return due || "—";
  const s = String(due).trim();
  const hourMatch = s.match(/^Overdue\s+(\d+)h(?:\s+\d+m)?$/i);
  if (hourMatch) return tm("dashboard.slaDue.overdueHours", { count: hourMatch[1] });
  const minMatch = s.match(/^Overdue\s+(\d+)m$/i);
  if (minMatch) return tm("dashboard.slaDue.overdueMinutes", { count: minMatch[1] });
  if (/^Overdue$/i.test(s)) return tm("dashboard.slaDue.overdue");
  return s;
}

/** @param {string} remaining @param {(key: string, opts?: object) => string} tm */
export function formatManagerSlaRemainingLabel(remaining, tm) {
  if (!remaining || remaining === "—") return remaining || "—";
  const s = String(remaining).trim();
  if (s === "0m") return tm("slaMonitor.remaining.zero");
  const hm = s.match(/^(\d+)h(?:\s+(\d+)m)?$/);
  if (hm) {
    if (hm[2]) return tm("slaMonitor.remaining.hoursMinutes", { hours: hm[1], minutes: hm[2] });
    return tm("slaMonitor.remaining.hours", { count: hm[1] });
  }
  const mm = s.match(/^(\d+)m$/);
  if (mm) return tm("slaMonitor.remaining.minutes", { count: mm[1] });
  return s;
}

/** @param {string} due @param {(key: string, opts?: object) => string} tm */
export function formatManagerSlaMonitorDueLabel(due, state, tm) {
  if (state === "breached") return formatManagerSlaDueLabel(due, tm);
  return formatManagerSlaRemainingLabel(due, tm);
}

/** @param {string|Date} iso @param {(key: string, opts?: object) => string} tm */
export function formatManagerDashboardRelativeTime(iso, tm) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Math.max(0, Date.now() - d.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return tm("dashboard.time.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return tm("dashboard.time.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return tm("dashboard.time.hoursAgo", { count: hr });
  const days = Math.floor(hr / 24);
  if (days < 7) return tm("dashboard.time.daysAgo", { count: days });
  return d.toLocaleDateString();
}

/**
 * @param {string} actor
 * @param {(key: string) => string} tm
 */
export function translateManagerActivityActor(actor, tm) {
  if (!actor || actor === "System") return tm("dashboard.activity.system");
  return actor;
}

/**
 * @param {string} text
 * @param {(key: string, opts?: object) => string} tm
 * @param {(key: string, opts?: object) => string} tc
 */
export function translateManagerActivityText(text, tm, tc) {
  if (!text) return text;
  let s = String(text);

  const prefixMap = [
    ["New ticket created", "dashboard.activity.events.ticketCreated"],
    ["Ticket updated", "dashboard.activity.events.ticketUpdated"],
    ["Ticket closed", "dashboard.activity.events.ticketClosed"],
    ["Comment added", "dashboard.activity.events.commentAdded"],
    ["Work logged", "dashboard.activity.events.workLogged"],
  ];
  for (const [en, key] of prefixMap) {
    if (s.startsWith(en)) {
      s = tm(key) + s.slice(en.length);
      break;
    }
  }

  s = s.replace(/Customer closed the request\.\s*Reason:\s*(\w+)/gi, (_, reason) =>
    tm("dashboard.activity.customerClosed", {
      reason: formatClosureReasonI18n(reason, tc) || reason,
    }),
  );

  s = s.replace(/Ticket assigned to\s+([^.]+)\.?/gi, (_, agent) =>
    tm("dashboard.activity.ticketAssigned", { agent: agent.trim() }),
  );

  s = s.replace(/Status changed:\s*([^→]+)→\s*(.+)$/gi, (_, from, to) => {
    const fromKey = STATUS_EN_TO_KEY[from.trim()] || from.trim().toLowerCase();
    const toKey = STATUS_EN_TO_KEY[to.trim()] || to.trim().toLowerCase();
    const fromLabel = tc(`status.${fromKey}`, { defaultValue: from.trim() });
    const toLabel = tc(`status.${toKey}`, { defaultValue: to.trim() });
    return tm("dashboard.activity.statusChanged", { from: fromLabel, to: toLabel });
  });

  s = s.replace(/ticket'ı/gi, tm("dashboard.activity.ticketWord"));

  return s;
}

/**
 * @param {string|{ key: string, params?: object }} insight
 * @param {(key: string, opts?: object) => string} tm
 */
export function formatManagerSlaInsight(insight, tm) {
  if (!insight) return "";
  if (typeof insight === "object" && insight.key) {
    return tm(insight.key, insight.params ?? {});
  }
  return String(insight);
}

/**
 * @param {string} rangeId
 * @param {string} product
 * @param {string} priority
 * @param {string} status
 * @param {(key: string, opts?: object) => string} tm
 * @param {(key: string, opts?: object) => string} tc
 */
export function buildManagerFlowHintText(rangeId, product, priority, status, tm, tc) {
  const rangePart = tm(`dashboard.ranges.${rangeId === "today" ? "today" : rangeId === "30d" ? "30d" : "7d"}`);
  const parts = [tm("dashboard.flow.hintTemplate", { range: rangePart })];
  if (product && product !== FILTER_ALL) {
    parts.push(translateManagerProductFilterValue(product, tm));
  }
  if (priority && priority !== FILTER_ALL) {
    parts.push(translateManagerPriorityFilterValue(priority, tm, tc));
  }
  if (status && status !== FILTER_ALL) {
    parts.push(translateManagerStatusFilterValue(status, tm, tc));
  }
  return parts.join(" · ");
}
