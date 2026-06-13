import { getSaasPriorityStyle } from "../../shared/saasPlatformTokens.js";
import { normalizeManagerStatusCode } from "../utils/managerFilterCodes";

/** SLA / priority / status pills — semantic color only. */
const KIND_CLASSES = {
  safe: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200/70",
  atRisk: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/70",
  breached: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/70",
  paused: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/80",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/80",
  statusNew: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200/80",
  statusInProgress: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/70",
  statusWaiting: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/70",
  statusResolved: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70",
  statusClosed: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/80",
};

const STATUS_KIND_MAP = {
  NEW: "statusNew",
  IN_PROGRESS: "statusInProgress",
  WAITING_FOR_CUSTOMER: "statusWaiting",
  RESOLVED: "statusResolved",
  CLOSED: "statusClosed",
};

/** Subtle status pill — SLA, priority, and workflow status. */
export default function ManagerStatusPill({ kind = "neutral", children }) {
  const toneClass = KIND_CLASSES[kind] || KIND_CLASSES.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight ${toneClass}`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-current"
      />
      {children}
    </span>
  );
}

/** Accepts enum codes (HIGH) or display labels (High). */
export function priorityKind(priority) {
  return getSaasPriorityStyle(priority).kind;
}

export function statusKind(status) {
  const code = normalizeManagerStatusCode(status);
  return STATUS_KIND_MAP[code] || "neutral";
}
