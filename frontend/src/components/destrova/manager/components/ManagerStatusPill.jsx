/** SLA / priority pills — semantic color only; workflow status uses slate neutral. */
const KIND_CLASSES = {
  safe: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200/70",
  atRisk: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/70",
  breached: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/70",
  paused: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/80",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/80",
};

/** Subtle status pill — used only for SLA / priority indicators. */
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

export function priorityKind(priority) {
  if (priority === "High") return "breached";
  if (priority === "Medium") return "atRisk";
  return "paused";
}

/** Status uses neutral chrome only — color is reserved for SLA & alerts. */
export function statusKind() {
  return "paused";
}
