const KIND_CLASSES = {
  safe:     "bg-destrova-success/10 text-destrova-success",
  atRisk:   "bg-destrova-warning/10 text-destrova-warning",
  breached: "bg-destrova-danger/10 text-destrova-danger",
  paused:   "bg-destrova-accent/10 text-destrova-text-secondary",
  neutral:  "bg-destrova-accent/10 text-destrova-text-secondary",
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
