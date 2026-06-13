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

/**
 * @param {string} slaState
 * @param {string} slaDue
 * @param {(key: string, opts?: object) => string} t
 */
export function formatAgentInboxSlaFooter(slaState, slaDue, t) {
  if (!slaDue) return "";
  if (slaState === "Breached") {
    const raw = slaDue.replace(/^Breached\s*/i, "").replace(/\s*ago$/i, "").trim();
    const dayMatch = raw.match(/^(\d+)d(?:\s+\d+h(?:\s+\d+m)?)?$/i);
    if (dayMatch) return t("inbox.slaOverdueDays", { count: dayMatch[1] });
    const hourMatch = raw.match(/^(\d+)h(?:\s+\d+m)?$/i);
    if (hourMatch) return t("inbox.slaOverdueHours", { count: hourMatch[1] });
    const minMatch = raw.match(/^(\d+)m$/i);
    if (minMatch) return t("inbox.slaOverdueMinutes", { count: minMatch[1] });
    if (!raw || raw.toLowerCase() === "breached") return t("ticketRow.overdue");
    return `${raw} ${t("sla.overdueSuffix")}`;
  }
  if (slaDue.startsWith("Due in ")) return `${slaDue.slice(7).trim()} ${t("sla.leftSuffix")}`;
  if (slaDue.startsWith("Paused")) return t("ticketRow.paused");
  return slaDue;
}
