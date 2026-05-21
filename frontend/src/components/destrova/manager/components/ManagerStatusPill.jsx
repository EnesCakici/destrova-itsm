import { MANAGER_COLORS, MANAGER_STATUS } from "../managerTokens";

/** Subtle status pill — used only for SLA / priority indicators. */
export default function ManagerStatusPill({ kind = "neutral", children }) {
  let fg = MANAGER_COLORS.support;
  let bg = "rgba(39,39,87,0.06)";
  if (MANAGER_STATUS[kind]) {
    fg = MANAGER_STATUS[kind].fg;
    bg = MANAGER_STATUS[kind].bg;
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight"
      style={{ color: fg, backgroundColor: bg }}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: fg }}
      />
      {children}
    </span>
  );
}

export function priorityKind(priority) {
  if (priority === "High") return "breached";
  if (priority === "Medium") return "atRisk";
  return "paused";
}

/** Status uses neutral chrome only — color is reserved for SLA & alerts. */
export function statusKind() {
  return "paused";
}
