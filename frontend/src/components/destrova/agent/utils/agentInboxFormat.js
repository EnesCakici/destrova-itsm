/**
 * Compact relative-time labels for the agent inbox list.
 * @param {string|number|Date} iso
 * @param {(key: string, opts?: object) => string} t — agent namespace
 */
export function formatAgentInboxRelativeTime(iso, t) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return t("inbox.listTime.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) return t("inbox.listTime.minutesAgo", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("inbox.listTime.hoursAgo", { count: hr });
  const day = Math.floor(hr / 24);
  if (day === 1) return t("inbox.listTime.yesterday");
  if (day < 7) return t("inbox.listTime.daysAgo", { count: day });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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
  if (ms <= 0) return t("ticketRow.overdue");
  const min = Math.floor(ms / 60000);
  if (min < 60) return t("inbox.slaOverdueMinutes", { count: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("inbox.slaOverdueHours", { count: hr });
  const day = Math.floor(hr / 24);
  return t("inbox.slaOverdueDays", { count: day });
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
 */
export function formatAgentInboxSlaFooter(slaState, slaDue, t, slaDueAt) {
  if (slaState === "Paused") return t("ticketRow.paused");
  if (!slaDue || slaDue === "—") return "";

  const dueAt = slaDueAt != null && slaDueAt !== "" ? new Date(slaDueAt) : null;
  if (dueAt && !Number.isNaN(dueAt.getTime())) {
    const now = Date.now();
    const dueMs = dueAt.getTime();
    if (slaState === "Breached" || dueMs < now) {
      return formatAgentDurationOverdue(now - dueMs, t);
    }
    return `${formatAgentDurationRemaining(dueMs - now, t)} ${t("sla.leftSuffix")}`;
  }

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
