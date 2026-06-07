import { useEffect, useMemo, useState } from "react";
import {
  ConversationActivityFilterButton,
  isAgentActivityEntry,
} from "../../shared/timelineActivityFilter.jsx";
import { formatMessageToHtml, messageProseClass } from "../../shared/storedRichHtml";

const MESSAGE_BUBBLE =
  "mt-1 rounded-lg border-l-[3px] bg-white p-3 shadow-agent-event ring-1 ring-inset";
const SYSTEM_LINE =
  "min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] leading-[1.35] text-slate-700 shadow-agent-event";
const ATTACHMENT_CARD =
  "min-w-0 flex-1 rounded-md border border-destrova-agent-border bg-white px-2.5 py-2 shadow-agent-event";

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

const FILTER_GHOST_BUTTON =
  "appearance-none border-0 bg-transparent shadow-none outline-none " +
  "focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2";

const COMPACT_SYSTEM_TYPES = new Set(["status_change", "system_note", "assignment", "sla_warning", "priority_change", "closure"]);

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

function LockIcon({ className = "h-3 w-3" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function initialsFromName(name) {
  const s = String(name || "").trim();
  if (!s || s.toLowerCase() === "system") return "·";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function KindBadge({ label, className = "", icon = null }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.06em] ring-1 ring-inset",
        className,
      ].join(" ")}
    >
      {icon}
      {label}
    </span>
  );
}

function systemAccent(ev) {
  if (ev.type === "sla_warning") return "#F59E0B";
  if (ev.type === "assignment") return "#64748B";
  return "#2563EB";
}

function SystemEvent({ ev }) {
  const accent = systemAccent(ev);
  const isStatusLine =
    ev.label === "Status" || /^Status changed:/i.test(String(ev.body || ""));
  let statusDetail = String(ev.body || "").trim();
  if (isStatusLine) {
    statusDetail = statusDetail.replace(/^Status changed:\s*/i, "");
  }

  const kind = isStatusLine ? "Status" : ev.label || "System";
  const message = isStatusLine
    ? statusDetail
    : [ev.title, ev.body].filter((part) => part != null && String(part).trim() !== "").join(" · ");

  return (
    <li className="relative flex items-center gap-2 py-0.5">
      <span className="relative z-[1] flex h-5 w-6 shrink-0 items-center justify-center" aria-hidden>
        <span
          className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white"
          style={{ backgroundColor: accent, boxShadow: `0 0 0 2px ${accent}22` }}
        />
      </span>
      <p className={SYSTEM_LINE}>
        <span className="font-semibold" style={{ color: accent }}>
          {kind}
        </span>
        {message ? (
          <>
            <span className="text-slate-500"> · </span>
            <span>{message}</span>
          </>
        ) : null}
        {ev.at ? (
          <span className="ml-1 whitespace-nowrap text-[10px] font-medium text-slate-500" title={ev.at}>
            · {ev.at}
          </span>
        ) : null}
      </p>
    </li>
  );
}

function messageVisuals(ev) {
  const isOriginal = ev.type === "original_request";
  const isCustomer = ev.type === "customer_reply" || ev.type === "external_comment";
  const isInternal = ev.type === "internal_note";
  const isAgent = ev.type === "agent_reply";
  const isWorklog = ev.type === "worklog";
  const isResolution = isAgent && ev.meta === "Awaiting customer review";

  if (isOriginal || isCustomer) {
    return {
      rowBg: "bg-sky-50/25",
      avatar: "bg-sky-100 text-sky-800 ring-sky-200/90",
      name: "text-sky-900",
      badge: {
        label: isOriginal ? "Original request" : "Customer",
        className: isOriginal
          ? "bg-white/90 text-slate-600 ring-slate-200/90"
          : "bg-sky-100 text-sky-800 ring-sky-200/80",
      },
      bubble: "border-sky-500 ring-sky-200/45 text-slate-800",
    };
  }
  if (isInternal) {
    return {
      rowBg: "bg-amber-50/25",
      avatar: "bg-amber-100 text-amber-900 ring-amber-200/90",
      name: "text-amber-900",
      badge: { label: "Internal", className: "bg-amber-100 text-amber-900 ring-amber-200/80" },
      bubble: "border-amber-500 ring-amber-200/45 text-slate-800",
    };
  }
  if (isWorklog) {
    return {
      rowBg: "bg-slate-50/50",
      avatar: "bg-slate-200 text-slate-700 ring-slate-300/80",
      name: "text-slate-800",
      badge: { label: "Worklog", className: "bg-slate-100 text-slate-700 ring-slate-200/80" },
      bubble: "border-slate-400 ring-slate-200/45 text-slate-800",
    };
  }
  if (isAgent) {
    return {
      rowBg: "bg-blue-50/20",
      avatar: "bg-blue-600 text-white ring-blue-200/60",
      name: "text-blue-900",
      badge: {
        label: isResolution ? "Solution proposed" : "Public reply",
        className: "bg-blue-100 text-blue-800 ring-blue-200/80",
      },
      bubble: "border-blue-600 ring-blue-200/40 text-slate-800",
    };
  }
  return {
    rowBg: "bg-slate-50/40",
    avatar: "bg-slate-200 text-slate-700 ring-slate-300/80",
    name: "text-slate-800",
    badge: { label: "Activity", className: "bg-slate-100 text-slate-700 ring-slate-200/80" },
    bubble: "border-slate-400 ring-slate-200/45 text-slate-800",
  };
}

function shouldShowMetaFooter(ev) {
  if (!ev.meta || ev.type === "internal_note" || ev.type === "worklog") return false;
  if (ev.type === "original_request") return false;
  return ev.meta === "Awaiting customer review" || ev.meta === "Decline reason";
}

function MessageEvent({ ev }) {
  const visuals = messageVisuals(ev);
  const isInternal = ev.type === "internal_note";
  const isWorklog = ev.type === "worklog";
  const displayName = ev.title || ev.actorName || "Team";
  const avatarLabel = initialsFromName(displayName);

  return (
    <li className={["relative flex gap-2 rounded-lg py-1 pr-0.5", visuals.rowBg].join(" ")}>
      <span className="relative z-[1] flex w-6 shrink-0 justify-center pt-2.5" aria-hidden>
        <span
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-inset",
            visuals.avatar,
          ].join(" ")}
        >
          {avatarLabel}
        </span>
      </span>

      <div className="min-w-0 flex-1 pb-0.5">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <p className={["text-[13px] font-semibold leading-tight", visuals.name].join(" ")}>{displayName}</p>
          <KindBadge label={visuals.badge.label} className={visuals.badge.className} icon={isInternal ? <LockIcon className="h-2.5 w-2.5 text-amber-800/80" /> : null} />
          {isWorklog && ev.durationMinutes != null && !Number.isNaN(ev.durationMinutes) ? (
            <span className="rounded-full bg-slate-200/80 px-1.5 py-px text-[9.5px] font-semibold tabular-nums text-slate-700">
              {ev.durationMinutes}m
            </span>
          ) : null}
          <time className="ml-auto text-[10.5px] text-slate-500" title={ev.at}>
            {ev.at}
          </time>
        </div>

        <div
          className={[MESSAGE_BUBBLE, messageProseClass(ev.body), visuals.bubble].join(" ")}
          dangerouslySetInnerHTML={{ __html: formatMessageToHtml(ev.body) }}
        />

        {shouldShowMetaFooter(ev) ? (
          <p className="mt-1 text-[10.5px] font-medium text-slate-500">{ev.meta}</p>
        ) : null}
      </div>
    </li>
  );
}

function AttachmentEvent({ ev, onDownload, ticketId }) {
  return (
    <li className="relative flex gap-2 py-1">
      <span className="relative z-[1] flex h-5 w-6 shrink-0 items-center justify-center" aria-hidden>
        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600 ring-2 ring-white" />
      </span>
      <div className={ATTACHMENT_CARD}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">Attachment</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-900">{ev.fileName || ev.title}</p>
            <p className="text-[10.5px] text-slate-500">
              {ev.fileSize}
              {ev.at ? ` · ${ev.at}` : ""}
            </p>
          </div>
          {onDownload && ev.attachmentId != null && ticketId != null ? (
            <button
              type="button"
              onClick={() => onDownload(ev.attachmentId, ev.fileName || ev.title)}
              className="shrink-0 rounded-agent-button p-1 text-slate-500 transition hover:bg-slate-50 hover:text-blue-700"
              title="Download"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function renderTimelineEvent(ev, onDownloadAttachment, ticketId) {
  if (ev.type === "attachment") {
    return <AttachmentEvent ev={ev} onDownload={onDownloadAttachment} ticketId={ticketId} />;
  }
  if (COMPACT_SYSTEM_TYPES.has(ev.type) || (ev.type === "status_change" && ev.variant === "system")) {
    return <SystemEvent ev={ev} />;
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
    return <MessageEvent ev={ev} />;
  }
  return <SystemEvent ev={ev} />;
}

export default function Timeline({ events, onDownloadAttachment, ticketId }) {
  const [activityLogOnly, setActivityLogOnly] = useState(false);

  useEffect(() => {
    setActivityLogOnly(false);
  }, [ticketId]);

  const list = useMemo(
    () => (events || []).filter((ev) => ALLOWED.has(ev.type)),
    [events],
  );

  const activityList = useMemo(
    () => list.filter(isAgentActivityEntry),
    [list],
  );

  const visibleList = useMemo(
    () => (activityLogOnly ? activityList : list),
    [activityLogOnly, activityList, list],
  );

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Conversation &amp; activity
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          <ConversationActivityFilterButton
            active={activityLogOnly}
            onToggle={() => setActivityLogOnly((v) => !v)}
            activityCount={activityList.length}
          />
          <span className="text-[10.5px] font-medium tabular-nums text-slate-500">
            {visibleList.length}{" "}
            {activityLogOnly
              ? visibleList.length === 1
                ? "activity"
                : "activities"
              : visibleList.length === 1
                ? "entry"
                : "entries"}
            {!activityLogOnly ? " · oldest first" : ""}
          </span>
        </div>
      </div>
      {visibleList.length === 0 ? (
        activityLogOnly ? (
          <div className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-700">No activity recorded yet</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Status changes, assignments, worklogs, attachments, and system events will appear here.
            </p>
            <button
              type="button"
              onClick={() => setActivityLogOnly(false)}
              className={`${FILTER_GHOST_BUTTON} mt-3 text-xs font-semibold text-blue-700 hover:text-blue-800`}
            >
              Show full conversation
            </button>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50 py-6 text-center text-sm leading-normal text-slate-500">
            No activity yet.
          </p>
        )
      ) : (
        <div className="relative">
          <div
            className="pointer-events-none absolute bottom-0.5 left-[calc(0.75rem)] top-0.5 w-px -translate-x-1/2 bg-gradient-to-b from-slate-200 via-slate-300/80 to-slate-200"
            aria-hidden
          />
          <ol className="relative space-y-1">
            {visibleList.map((ev) => {
              const key = ev.eventKey || `${ev.type}-${ev.at}`;
              return (
                <div key={key} role="presentation">
                  {renderTimelineEvent(ev, onDownloadAttachment, ticketId)}
                </div>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
