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

/** Role pill — matches customer portal conversation badges (visual only). */
function RoleBadge({ tone, children }) {
  const tones = {
    customer: "bg-sky-100 text-sky-800 ring-sky-200/80",
    agent: "bg-violet-100 text-violet-800 ring-violet-200/80",
    internal: "bg-amber-100 text-amber-900 ring-amber-200/80",
    worklog: "bg-slate-100 text-slate-700 ring-slate-200/80",
    neutral: "bg-white/80 text-slate-600 ring-slate-200/90",
  };
  return (
    <span
      className={[
        "inline-flex items-center gap-0.5 rounded-full px-1 py-px text-[9px] font-semibold uppercase tracking-[0.05em] ring-1 ring-inset",
        tones[tone] || tones.neutral,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function SystemEvent({ ev }) {
  const isStatusLine =
    ev.label === "Status" || /^Status changed:/i.test(String(ev.body || ""));
  let statusDetail = String(ev.body || "").trim();
  if (isStatusLine) {
    statusDetail = statusDetail.replace(/^Status changed:\s*/i, "");
  }

  return (
    <li className="relative flex items-center gap-1.5 py-px">
      <span className="relative z-[1] flex h-5 w-6 shrink-0 items-center justify-center self-center" aria-hidden>
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-violet-600 ring-2 ring-white"
          style={{ boxShadow: "0 0 0 2px #7c3aed22" }}
        />
      </span>
      <p className="min-w-0 flex-1 rounded-md border border-violet-200/55 bg-violet-50/45 px-1.5 py-0.5 text-[10.5px] leading-[1.3] text-violet-950/85">
        {isStatusLine ? (
          <>
            <span className="font-semibold text-violet-700">Status</span>
            {statusDetail ? (
              <>
                <span className="text-violet-800/75"> · </span>
                <span>{statusDetail}</span>
              </>
            ) : null}
          </>
        ) : (
          <>
            <span className="font-semibold text-violet-700">{ev.label || "System"}</span>
            {ev.title ? (
              <>
                <span className="text-violet-800/75"> · </span>
                <span className="font-medium text-violet-900/90">{ev.title}</span>
              </>
            ) : null}
            {ev.body ? (
              <>
                <span className="text-violet-800/75"> · </span>
                <span>{ev.body}</span>
              </>
            ) : null}
          </>
        )}
        {ev.at ? (
          <span className="ml-1 whitespace-nowrap text-[10px] font-medium text-violet-600/65">· {ev.at}</span>
        ) : null}
      </p>
    </li>
  );
}

function MessageEvent({ ev }) {
  const isOriginal = ev.type === "original_request";
  const isCustomer = ev.type === "customer_reply" || ev.type === "external_comment" || isOriginal;
  const isInternal = ev.type === "internal_note";
  const isAgent = ev.type === "agent_reply";
  const isWorklog = ev.type === "worklog";

  const rowBg = isInternal
    ? "bg-amber-50/30"
    : isCustomer
      ? "bg-sky-50/25"
      : isWorklog
        ? "bg-slate-50/35"
        : "bg-violet-50/20";

  const avatarClass = isInternal
    ? "bg-amber-100 text-amber-900 ring-amber-200/90"
    : isCustomer
      ? "bg-sky-100 text-sky-800 ring-sky-200/90"
      : isWorklog
        ? "bg-slate-200 text-slate-800 ring-slate-300/80"
        : "bg-violet-600 text-white ring-violet-300/40";

  const nameClass = isInternal
    ? "text-amber-900"
    : isCustomer
      ? "text-sky-900"
      : isWorklog
        ? "text-slate-800"
        : "text-violet-900";

  const bodyChrome = isInternal
    ? "border-amber-500 bg-white ring-amber-200/45"
    : isCustomer
      ? "border-sky-500 bg-white ring-sky-200/45"
      : isWorklog
        ? "border-slate-400 bg-white ring-slate-200/50"
        : "border-violet-600 bg-white/90 ring-violet-200/40";

  const displayName = ev.title || ev.actorName || (isCustomer ? "Customer" : isAgent ? "Agent" : "Team");

  return (
    <li className={["relative flex gap-1.5 rounded-md py-1 pr-0.5", rowBg].join(" ")}>
      <span className="relative z-[1] flex w-6 shrink-0 justify-center" aria-hidden>
        <span
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ring-1 ring-inset",
            avatarClass,
          ].join(" ")}
        >
          {ev.avatarText || "·"}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0">
          <p className={["text-[11.5px] font-semibold leading-tight", nameClass].join(" ")}>{displayName}</p>

          {isCustomer ? <RoleBadge tone="customer">Customer</RoleBadge> : null}
          {isAgent ? <RoleBadge tone="agent">Agent</RoleBadge> : null}
          {isInternal ? (
            <RoleBadge tone="internal">
              <LockIcon className="h-3 w-3 text-amber-800/80" />
              Internal
            </RoleBadge>
          ) : null}
          {isWorklog ? <RoleBadge tone="worklog">Worklog</RoleBadge> : null}
          {isOriginal ? <RoleBadge tone="neutral">Original request</RoleBadge> : null}

          {isWorklog && ev.durationMinutes != null && !Number.isNaN(ev.durationMinutes) ? (
            <span className="rounded-full bg-slate-200/80 px-1 py-px text-[9px] font-semibold tabular-nums text-slate-700">
              {ev.durationMinutes}m
            </span>
          ) : null}

          <time className="ml-auto text-[10px] text-slate-500" title={ev.at}>
            {ev.at}
          </time>
        </div>

        <div
          className={[
            "mt-0.5 rounded-md border-l-2 px-2 py-1.5 text-[12px] leading-snug text-slate-800 ring-1 ring-inset",
            bodyChrome,
          ].join(" ")}
        >
          <p className="whitespace-pre-wrap">{ev.body}</p>
        </div>

        {ev.meta && !isInternal && !isWorklog ? (
          <p className="mt-0.5 text-[9.5px] font-medium text-slate-400">{ev.meta}</p>
        ) : null}
      </div>
    </li>
  );
}

function AttachmentEvent({ ev, onDownload, ticketId }) {
  return (
    <li className="relative flex gap-1.5 py-px pl-0">
      <span className="flex w-6 shrink-0 justify-center" aria-hidden>
        <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200/90">
          <DownloadIcon className="h-3 w-3" />
        </span>
      </span>
      <div className="min-w-0 flex-1 rounded-md border border-slate-200/80 bg-white px-2 py-1.5 ring-1 ring-inset ring-slate-200/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Attachment</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-900">{ev.fileName || ev.title}</p>
            <p className="text-[11px] text-slate-500">
              {ev.fileSize}
              {ev.at ? ` · ${ev.at}` : ""}
            </p>
          </div>
          {onDownload && ev.attachmentId != null && ticketId != null ? (
            <button
              type="button"
              onClick={() => onDownload(ev.attachmentId, ev.fileName || ev.title)}
              className="shrink-0 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-violet-700"
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
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Conversation &amp; activity</h2>
        <span className="text-[10px] font-medium tabular-nums text-slate-400">
          {list.length} {list.length === 1 ? "entry" : "entries"} · oldest first
        </span>
      </div>
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 py-8 text-center text-sm text-slate-500">
          No activity yet.
        </p>
      ) : (
        <div className="relative">
          <div
            className="pointer-events-none absolute bottom-0.5 left-[calc(0.75rem)] top-0.5 w-px -translate-x-1/2 bg-gradient-to-b from-slate-200 via-violet-200/80 to-slate-200"
            aria-hidden
          />
          <ol className="relative space-y-0.5">
            {list.map((ev) => {
              const key = ev.eventKey || `${ev.type}-${ev.at}`;
              if (ev.type === "attachment") {
                return (
                  <AttachmentEvent key={key} ev={ev} onDownload={onDownloadAttachment} ticketId={ticketId} />
                );
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
                [
                  "customer_reply",
                  "agent_reply",
                  "external_comment",
                  "internal_note",
                  "worklog",
                  "original_request",
                ].includes(ev.type)
              ) {
                return <MessageEvent key={key} ev={ev} />;
              }
              return <SystemEvent key={key} ev={ev} />;
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
