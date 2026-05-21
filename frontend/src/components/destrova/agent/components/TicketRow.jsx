function statusPill(status) {
  if (status === "In Progress") return "bg-blue-50 text-blue-700";
  if (status === "Waiting for Customer") return "bg-amber-50 text-amber-800";
  if (status === "Resolved") return "bg-emerald-50 text-emerald-700";
  if (status === "Closed") return "bg-slate-100 text-slate-600";
  if (status === "New") return "bg-slate-100 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

function priorityPill(priority) {
  if (priority === "High") return "bg-red-50 text-red-700";
  if (priority === "Medium") return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function slaPill(state) {
  if (state === "At Risk") return { wrap: "bg-amber-50 text-amber-950", dot: "bg-orange-500", label: "At Risk" };
  if (state === "Breached") return { wrap: "bg-red-50 text-red-800", dot: "bg-red-500", label: "Breached" };
  if (state === "Paused") return { wrap: "bg-slate-100 text-slate-700", dot: "bg-slate-500", label: "Paused" };
  return { wrap: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500", label: "Safe" };
}

function slaBar(state) {
  if (state === "Breached") return { fill: "bg-red-500", width: 100 };
  if (state === "At Risk") return { fill: "bg-orange-500", width: 40 };
  if (state === "Paused") return { fill: "bg-slate-400", width: 35 };
  return { fill: "bg-blue-500", width: 42 };
}

/** Footer left: time remaining / SLA hint (blue emphasis like reference). */
function footerTimeLeft(slaState, slaDue) {
  if (!slaDue) return "";
  if (slaState === "Breached") {
    const t = slaDue.replace(/^Breached\s*/i, "").replace(/\s*ago$/i, "");
    return t ? `${t} overdue` : "Overdue";
  }
  if (slaDue.startsWith("Due in ")) return `${slaDue.slice(7).trim()} left`;
  if (slaDue.startsWith("Paused")) return "Paused";
  return slaDue;
}

function footerTimeClass(slaState) {
  if (slaState === "Breached") return "text-red-600";
  if (slaState === "Paused") return "text-slate-600";
  return "text-blue-700";
}

function LinkOutIcon({ className = "h-3.5 w-3.5 text-slate-300" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 17L17 7M7 7h10v10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TicketRow({ ticket, selected, onSelect }) {
  const slaP = slaPill(ticket.slaState);
  const bar = slaBar(ticket.slaState);
  const timeLeft = footerTimeLeft(ticket.slaState, ticket.slaDue);
  const timeClass = footerTimeClass(ticket.slaState);

  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      className={[
        "group relative w-full rounded-lg border-2 bg-white text-left shadow-md transition-[border-color,box-shadow] duration-150",
        "px-2.5 py-2",
        selected
          ? "border-[#97afb9] shadow-none"
          : "border-slate-200/10",
      ].join(" ")}
    >
      <div className="flex flex-col">
        {/* Header: ID + subtle icon */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {ticket.resolutionDeclined ? (
              <span
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-2 ring-amber-300/80"
                title="Customer declined the proposed resolution"
                aria-label="Customer declined the proposed resolution"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92ZM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-8a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            ) : null}
            {ticket.unread > 0 ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-2 ring-blue-200"
                title="Unread"
                aria-hidden
              />
            ) : null}
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {ticket.displayId ?? ticket.id}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {ticket.unread > 0 ? (
              <span className="min-w-[1.1rem] rounded-md bg-blue-200 px-1 py-0.5 text-center text-[10px] font-extrabold leading-none tabular-nums text-blue-950">
                {ticket.unread > 9 ? "9+" : ticket.unread}
              </span>
            ) : null}
            <span aria-hidden>
              <LinkOutIcon className="h-3 w-3 text-slate-300" />
            </span>
          </div>
        </div>

        {ticket.activityLabel ||
        ticket.customerReplied ||
        (ticket.internalNoteHint && !ticket.customerReplied) ||
        ticket.resolutionDeclined ? (
          <p className="mt-0.5 text-[10px] font-extrabold">
            {ticket.activityLabel ? (
              <span
                className={
                  ticket.resolutionDeclined || String(ticket.activityLabel).includes("rejected")
                    ? "text-amber-800"
                    : "text-blue-800"
                }
              >
                {ticket.activityLabel}
              </span>
            ) : (
              <>
                {ticket.resolutionDeclined ? <span className="text-amber-800">Customer rejected</span> : null}
                {ticket.resolutionDeclined && (ticket.customerReplied || (ticket.internalNoteHint && !ticket.customerReplied)) ? (
                  <span className="text-slate-300"> · </span>
                ) : null}
                {ticket.customerReplied ? <span className="text-blue-700">Customer replied</span> : null}
                {ticket.internalNoteHint && !ticket.customerReplied ? (
                  <span className="text-amber-800/90">Internal note</span>
                ) : null}
              </>
            )}
          </p>
        ) : null}

        {/* Title */}
        <p
          className={[
            "mt-0.5 truncate text-left text-[14px] font-semibold leading-tight tracking-tight",
            ticket.unread > 0 ? "text-slate-950" : "text-slate-900",
          ].join(" ")}
        >
          {ticket.title}
        </p>

        {/* Customer · product */}
        <p className="mt-0 truncate text-[12px] leading-tight text-slate-500">
          {ticket.customer}
          <span className="text-slate-300"> · </span>
          {ticket.productName}
        </p>

        {/* Pills: status, priority, SLA — borderless */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={`max-w-full truncate rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none ${statusPill(ticket.status)}`}>{ticket.status}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${priorityPill(ticket.priority)}`}>{ticket.priority}</span>
          <span
            className={`inline-flex max-w-full items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none ${slaP.wrap}`}
            title={ticket.slaDue ? `SLA: ${ticket.slaDue}` : "SLA"}
          >
            <span className={`h-1 w-1 shrink-0 rounded-full ${slaP.dot}`} />
            {slaP.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200/90">
          <div className={`h-full rounded-full transition-[width] duration-300 ${bar.fill}`} style={{ width: `${bar.width}%` }} />
        </div>

        {/* Footer: time left · updated */}
        <div className="mt-1.5 flex items-baseline justify-between gap-1.5">
          <span className={`min-w-0 truncate text-[12px] font-medium leading-tight ${timeClass}`}>{timeLeft}</span>
          <span className="shrink-0 tabular-nums text-[10px] leading-tight text-slate-400">{ticket.updatedAt}</span>
        </div>
      </div>
    </button>
  );
}
