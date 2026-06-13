/** Shared activity-log filter for manager + agent conversation timelines. */

const FILTER_GHOST_BUTTON =
  "appearance-none border-0 bg-transparent shadow-none outline-none " +
  "focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2";

export const MANAGER_ACTIVITY_ENTRY_TYPES = new Set([
  "status_change",
  "assignment",
  "sla_warning",
  "worklog",
]);

export const AGENT_ACTIVITY_ENTRY_TYPES = new Set([
  "status_change",
  "priority_change",
  "assignment",
  "sla_warning",
  "closure",
  "worklog",
  "system_note",
  "attachment",
]);

export function isManagerActivityEntry(entry) {
  return MANAGER_ACTIVITY_ENTRY_TYPES.has(entry?.type);
}

export function isAgentActivityEntry(event) {
  return AGENT_ACTIVITY_ENTRY_TYPES.has(event?.type);
}

function IconActivityLog({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path d="M3 3.5h10v9H3z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M5.5 6.5h5M5.5 9h3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M10.5 2.5v2M5.5 2.5v2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function ConversationActivityFilterButton({
  active,
  onToggle,
  activityCount,
  label = "Activity log",
  titleActive = "Show full conversation and activity",
  titleInactive = "Show activity log only",
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={active ? titleActive : titleInactive}
      className={[
        FILTER_GHOST_BUTTON,
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold tracking-tight transition-all duration-150",
        active
          ? "border-blue-200 bg-blue-50 text-blue-800 shadow-sm ring-1 ring-inset ring-blue-200/70"
          : "border-slate-200/90 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
      ].join(" ")}
    >
      <IconActivityLog className={`h-3.5 w-3.5 shrink-0 ${active ? "text-blue-600" : "text-slate-500"}`} />
      <span>{label}</span>
      <span
        className={[
          "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums ring-1 ring-inset",
          active ? "bg-blue-100/80 text-blue-700 ring-blue-200/70" : "bg-slate-100 text-slate-500 ring-slate-200/80",
        ].join(" ")}
      >
        {activityCount}
      </span>
    </button>
  );
}
