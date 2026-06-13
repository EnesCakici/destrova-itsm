import { parseApiDateTimeMs } from "../../../../utils/apiDateTime.js";

/**
 * Compact relative-time labels for the agent inbox list.
 * @param {string|number|Date} iso
 * @param {(key: string, opts?: object) => string} t — agent namespace
 */
export function formatAgentInboxRelativeTime(iso, t) {
  if (!iso) return "—";
  const ms = parseApiDateTimeMs(iso);
  if (ms == null) return "—";
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return t("inbox.listTime.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return t("inbox.listTime.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("inbox.listTime.hoursAgo", { count: hr });
  const day = Math.floor(hr / 24);
  if (day === 1) return t("inbox.listTime.yesterday");
  if (day < 7) return t("inbox.listTime.daysAgo", { count: day });
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export { parseApiDateTimeMs } from "../../../../utils/apiDateTime.js";

/** @param {number} ms @param {(key: string, opts?: object) => string} t */
function formatAgentDurationRemaining(ms, t) {
  if (ms <= 0) return t("sla.remaining.zero");
  const min = Math.floor(ms / 60000);
  if (min < 60) return t("sla.remaining.minutes", { count: min });
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 48) {
    if (m) return t("sla.remaining.hoursMinutes", { hours: h, minutes: m });
    return t("sla.remaining.hours", { count: h });
  }
  const d = Math.floor(h / 24);
  return t("sla.remaining.days", { count: d });
}

/** @param {number} ms @param {(key: string, opts?: object) => string} t */
function formatAgentDurationOverdue(ms, t) {
  return formatAgentDurationOverdueDetailed(ms, t);
}

/** @param {number} ms @param {(key: string, opts?: object) => string} t */
function formatAgentDurationOverdueDetailed(ms, t) {
  if (ms <= 0) return t("ticketRow.overdue");
  const min = Math.floor(ms / 60000);
  if (min < 60) return t("sla.overdue.minutes", { count: min });
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 48) {
    if (m) return t("sla.overdue.hoursMinutes", { hours: h, minutes: m });
    return t("sla.overdue.hours", { count: h });
  }
  const d = Math.floor(h / 24);
  return t("sla.overdue.days", { count: d });
}

/**
 * Fallback: parse legacy English `slaDue` from mapper when ISO is unavailable.
 * @param {string} raw
 * @param {(key: string, opts?: object) => string} t
 */
function formatAgentInboxSlaFooterFromEnglish(raw, t) {
  const dayMatch = raw.match(/^(\d+)d(?:\s+\d+h(?:\s+\d+m)?)?$/i);
  if (dayMatch) return `${t("sla.remaining.days", { count: dayMatch[1] })} ${t("sla.leftSuffix")}`;
  const hourMatch = raw.match(/^(\d+)h(?:\s+(\d+)m)?$/i);
  if (hourMatch) {
    const label = hourMatch[2]
      ? t("sla.remaining.hoursMinutes", { hours: hourMatch[1], minutes: hourMatch[2] })
      : t("sla.remaining.hours", { count: hourMatch[1] });
    return `${label} ${t("sla.leftSuffix")}`;
  }
  const minMatch = raw.match(/^(\d+)m$/i);
  if (minMatch) return `${t("sla.remaining.minutes", { count: minMatch[1] })} ${t("sla.leftSuffix")}`;
  return `${raw} ${t("sla.leftSuffix")}`;
}

/**
 * @param {string} slaState
 * @param {string} slaDue
 * @param {(key: string, opts?: object) => string} t
 * @param {string|number|Date|null|undefined} [slaDueAt]
 * @param {number} [nowMs] — optional clock for live inbox countdown
 */
export function formatAgentInboxSlaFooter(slaState, slaDue, t, slaDueAt, nowMs) {
  if (slaState === "Stopped" || slaState === "—") return "";

  const now = nowMs ?? Date.now();
  const dueMs = parseApiDateTimeMs(slaDueAt);

  if (slaState === "Paused") {
    if (dueMs != null && dueMs > now) {
      return `${formatAgentDurationRemaining(dueMs - now, t)} ${t("sla.leftSuffix")}`;
    }
    if (slaDue && slaDue.startsWith("Due in ")) {
      return formatAgentInboxSlaFooterFromEnglish(slaDue.slice(7).trim(), t);
    }
    return t("ticketRow.paused");
  }

  if (slaState === "Breached") {
    if (dueMs != null) {
      return formatAgentDurationOverdue(Math.max(0, now - dueMs), t);
    }
  } else if (dueMs != null && dueMs > now) {
    return `${formatAgentDurationRemaining(dueMs - now, t)} ${t("sla.leftSuffix")}`;
  }

  if (!slaDue || slaDue === "—") return "";

  if (slaState === "Breached") {
    const raw = slaDue.replace(/^Breached\s*/i, "").replace(/\s*ago$/i, "").trim();
    if (!raw || raw.toLowerCase() === "breached") return t("ticketRow.overdue");
    const dayMatch = raw.match(/^(\d+)d(?:\s+\d+h(?:\s+\d+m)?)?$/i);
    if (dayMatch) return t("inbox.slaOverdueDays", { count: dayMatch[1] });
    const hourMatch = raw.match(/^(\d+)h(?:\s+\d+m)?$/i);
    if (hourMatch) return t("inbox.slaOverdueHours", { count: hourMatch[1] });
    const minMatch = raw.match(/^(\d+)m$/i);
    if (minMatch) return t("inbox.slaOverdueMinutes", { count: minMatch[1] });
    return `${raw} ${t("sla.overdueSuffix")}`;
  }

  if (slaDue.startsWith("Due in ")) {
    return formatAgentInboxSlaFooterFromEnglish(slaDue.slice(7).trim(), t);
  }

  if (slaDue.startsWith("Paused")) return t("ticketRow.paused");
  return slaDue;
}

/**
 * Sol panel SLA sayacı — `slaDueAt` (jBPM) + backend `slaState` birlikte kullanılır.
 * Gecikme yalnızca backend BREACHED iken; kalan süre Safe/At Risk/Paused için.
 * @param {string} slaState
 * @param {string|number|Date|null|undefined} slaDueAt
 * @param {string} [slaDue]
 * @param {(key: string, opts?: object) => string} t
 * @param {number} [nowMs]
 */
export function formatAgentInboxSlaCountdownLabel(slaState, slaDueAt, slaDue, t, nowMs) {
  if (slaState === "Stopped" || slaState === "—") return "";

  const now = nowMs ?? Date.now();
  const dueMs = parseApiDateTimeMs(slaDueAt);

  if (slaState === "Breached") {
    if (dueMs != null) {
      return formatAgentDurationOverdueDetailed(Math.max(0, now - dueMs), t);
    }
    return t("ticketRow.overdue");
  }

  if (dueMs != null && dueMs > now) {
    return `${formatAgentDurationRemaining(dueMs - now, t)} ${t("sla.leftSuffix")}`;
  }

  if (slaDue && slaDue.startsWith("Due in ")) {
    return formatAgentInboxSlaFooterFromEnglish(slaDue.slice(7).trim(), t);
  }

  if (slaState === "Paused") return t("ticketRow.paused");
  return "";
}
