const STATUS_CLASSES = {
  NEW: "border-destrova-accent/15 bg-destrova-accent/10 text-destrova-accent",
  OPEN: "border-destrova-accent/15 bg-destrova-accent/10 text-destrova-accent",
  IN_PROGRESS: "border-destrova-accent/15 bg-destrova-accent/10 text-destrova-accent",
  WAITING_CUSTOMER: "border-destrova-warning/15 bg-destrova-warning/10 text-destrova-warning",
  RESOLVED: "border-destrova-success/15 bg-destrova-success/10 text-destrova-success",
  CLOSED: "border-destrova-border-subtle bg-destrova-text-muted/10 text-destrova-text-secondary",
};

export default function StatusBadge({ status, syncing = false }) {
  const className = STATUS_CLASSES[status] || STATUS_CLASSES.NEW;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}>{status}</span>
      {syncing ? (
        <span
          className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-destrova-accent/20 border-t-destrova-accent"
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destrova-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-destrova-warning ring-1 ring-inset ring-destrova-warning/15">
        <span
          className="h-3 w-3 animate-spin rounded-full border-2 border-destrova-warning/30 border-t-destrova-warning"
          aria-hidden
        />
        Syncing…
      </span>
    );
  }
  if (state === "timeout") {
    return (
      <span className="inline-flex items-center rounded-full bg-destrova-warning/10 px-2.5 py-0.5 text-[11px] font-semibold text-destrova-warning ring-1 ring-inset ring-destrova-warning/15">
        Sync pending
      </span>
    );
  }
  return null;
}
