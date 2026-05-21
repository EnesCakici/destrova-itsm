const ALLOWED = new Set([
  "customer_reply",
  "agent_reply",
  "external_comment",
  "internal_note",
  "worklog",
  "status_change",
  "priority_change",
  "assignment",
  "sla_warning",
  "closure",
  "attachment",
  "system_note",
  "original_request",
]);

function DownloadIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v10m0 0l3.5-3.5M12 13L8.5 9.5M5 19h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.52-.4-1.08-.73-1.69-.98l-.36-2.54A.484.484 0 0 0 14 2h-3.99c-.24 0-.43.17-.47.41l-.36 2.54c-.61.25-1.17.59-1.69.98l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.52.4 1.08.73 1.69.98l.36 2.54c.05.24.24.41.48.41H14c.24 0 .44-.17.47-.41l.36-2.54c.61-.25 1.17-.59 1.69-.98l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

function SystemEvent({ ev }) {
  return (
    <li className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200/90 text-slate-600">
        <GearIcon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 rounded-xl bg-slate-50/50 px-3 py-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{ev.label || "System"}</span>
          <time className="text-[11px] tabular-nums text-slate-400">{ev.at}</time>
        </div>
        <p className="mt-0.5 text-sm font-medium text-slate-700">{ev.title}</p>
        {ev.body ? <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{ev.body}</p> : null}
      </div>
    </li>
  );
}

function MessageEvent({ ev }) {
  const isOriginal = ev.type === "original_request";
  const isCustomer = ev.type === "customer_reply" || ev.type === "external_comment" || isOriginal;
  const isInternal = ev.type === "internal_note";
  const isAgent = ev.type === "agent_reply";
  const isWorklog = ev.type === "worklog";

  const shell = isInternal
    ? "bg-gradient-to-br from-amber-50 to-amber-50/30 ring-1 ring-amber-200/40"
    : isCustomer
      ? "bg-gradient-to-br from-blue-50/95 to-indigo-50/40 ring-1 ring-blue-200/35"
      : isAgent
        ? "bg-gradient-to-br from-teal-50/95 to-emerald-50/35 ring-1 ring-teal-200/40"
        : isWorklog
          ? "bg-slate-50 ring-1 ring-slate-200/50"
          : "bg-white ring-1 ring-slate-200/60";

  const av = isInternal
    ? "bg-amber-200 text-amber-950"
    : isCustomer
      ? "bg-blue-200 text-blue-950"
      : isWorklog
        ? "bg-slate-300 text-slate-800"
        : "bg-teal-200 text-teal-950";

  const labelClass = isInternal
    ? "text-amber-800"
    : isCustomer
      ? "text-blue-700"
      : isAgent
        ? "text-teal-700"
        : isWorklog
          ? "text-slate-600"
          : "text-slate-600";

  return (
    <li className="flex gap-3">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${av}`}
        aria-hidden
      >
        {ev.avatarText || "·"}
      </div>
      <div className={`min-w-0 flex-1 rounded-2xl px-4 py-3 ${shell}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-semibold ${labelClass}`}>{ev.label}</span>
            {isInternal ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                <LockIcon className="h-3 w-3 text-amber-800/80" />
                Internal only
              </span>
            ) : null}
            {isWorklog && ev.durationMinutes != null && !Number.isNaN(ev.durationMinutes) ? (
              <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {ev.durationMinutes}m
              </span>
            ) : null}
          </div>
          <time className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">{ev.at}</time>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-slate-900">{ev.title || ev.actorName}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{ev.body}</p>
        {ev.meta && !isInternal && !isWorklog ? <p className="mt-1.5 text-[10px] font-medium text-slate-400">{ev.meta}</p> : null}
      </div>
    </li>
  );
}

function AttachmentEvent({ ev, onDownload, ticketId }) {
  return (
    <li className="flex gap-3 pl-11">
      <div className="min-w-0 flex-1 rounded-xl bg-white/90 px-3 py-2.5 ring-1 ring-slate-200/70">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Attachment</p>
            <p className="mt-0.5 truncate text-sm font-medium text-slate-900">{ev.fileName || ev.title}</p>
            <p className="text-xs text-slate-500">
              {ev.fileSize} · {ev.at}
            </p>
          </div>
          {onDownload && ev.attachmentId != null && ticketId != null ? (
            <button
              type="button"
              onClick={() => onDownload(ev.attachmentId, ev.fileName || ev.title)}
              className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-blue-600"
              title="Download"
            >
              <DownloadIcon />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function Timeline({ events, onDownloadAttachment, ticketId }) {
  const list = (events || []).filter((ev) => ALLOWED.has(ev.type));

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Conversation &amp; Activity</h2>
        <span className="text-[11px] font-medium text-slate-400">Oldest → newest</span>
      </div>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/50 py-8 text-center text-sm text-slate-500">No activity yet.</p>
      ) : (
        <ol className="relative flex flex-col gap-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200/80">
          {list.map((ev) => {
            const key = ev.eventKey || `${ev.type}-${ev.at}`;
            if (ev.type === "attachment") {
              return <AttachmentEvent key={key} ev={ev} onDownload={onDownloadAttachment} ticketId={ticketId} />;
            }
            if (
              ev.type === "closure" ||
              ev.type === "priority_change" ||
              ev.type === "assignment" ||
              ev.type === "system_note" ||
              (ev.type === "status_change" && ev.variant === "system")
            ) {
              return <SystemEvent key={key} ev={ev} />;
            }
            if (
              ["customer_reply", "agent_reply", "external_comment", "internal_note", "worklog", "original_request"].includes(ev.type)
            ) {
              return <MessageEvent key={key} ev={ev} />;
            }
            return <SystemEvent key={key} ev={ev} />;
          })}
        </ol>
      )}
    </div>
  );
}
