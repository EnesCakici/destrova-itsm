const STATUS_CLASSES = {
  NEW: "border-slate-200 bg-slate-100 text-slate-700",
  OPEN: "border-blue-200 bg-blue-50 text-blue-700",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  WAITING_CUSTOMER: "border-amber-200 bg-amber-50 text-amber-700",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-300 bg-slate-200 text-slate-700",
};

export default function StatusBadge({ status, syncing = false }) {
  const className = STATUS_CLASSES[status] || STATUS_CLASSES.NEW;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}>{status}</span>
      {syncing ? (
        <span
          className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600"
          aria-hidden
        />
      ) : null}
    </span>
  );
}

/** Agent/customer projection poll indicator. */
export function SyncStateChip({ state }) {
  if (state === "syncing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200/80">
        <span
          className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700"
          aria-hidden
        />
        Syncing…
      </span>
    );
  }
  if (state === "timeout") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200/80">
        Sync pending
      </span>
    );
  }
  return null;
}
