/**
 * Compact ticket context strip — ID, status, priority, SLA, meta.
 * Shared across customer, manager, and agent detail surfaces.
 */

const PORTAL_SHELL = {
  customer: "border-b border-gray-200 bg-white",
  manager: "border-b border-gray-200 bg-white",
  agent: "border-b border-slate-100/90 bg-white",
};

export function TicketContextDot() {
  return (
    <span className="text-[11px] font-medium text-slate-300" aria-hidden>
      ·
    </span>
  );
}

export function TicketContextMetaItem({ label, value, mono = false }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-slate-500">
      <span className="font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</span>
      <span className={mono ? "truncate font-mono font-semibold text-slate-600" : "truncate font-medium text-slate-700"}>
        {value}
      </span>
    </span>
  );
}

export default function TicketContextBar({
  portal = "customer",
  children,
  trailing = null,
  className = "",
}) {
  return (
    <div
      className={[
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-5",
        PORTAL_SHELL[portal] || PORTAL_SHELL.customer,
        className,
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {trailing ? <div className="flex shrink-0 flex-wrap items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
