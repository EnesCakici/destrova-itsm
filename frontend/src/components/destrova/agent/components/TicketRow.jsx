import { useTranslation } from "react-i18next";
import {
  formatAgentInboxRelativeTime,
} from "../utils/agentInboxFormat";
import AgentInboxSlaCountdown from "./AgentInboxSlaCountdown";
import {
  getAgentPriorityClasses,
  getAgentSlaBarClasses,
  getAgentStatusClasses,
} from "../agentTokens";
import {
  mapPriorityLabelI18n,
  mapSlaStateLabelI18n,
  mapTicketStatusLabelI18n,
} from "../mappers/agentTicketMappers";

const ACTIVITY_HINT_KEYS = {
  "Customer rejected": "ticketRow.activity.customerRejected",
  "Customer replied": "ticketRow.activity.customerReplied",
  "Internal note": "ticketRow.activity.internalNote",
  "Transfer pending": "ticketRow.activity.transferPending",
  "New update": "ticketRow.activity.newUpdate",
};

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

function ActivityLine({ ticket, t }) {
  const show =
    ticket.activityLabel ||
    ticket.activityHint ||
    ticket.customerReplied ||
    (ticket.internalNoteHint && !ticket.customerReplied);
  if (!show) return null;

  const hintKey = ticket.activityHint ? ACTIVITY_HINT_KEYS[ticket.activityHint] : null;
  const translatedHint = hintKey ? t(hintKey) : ticket.activityLabel;

  return (
    <p className="mt-1 text-xs font-semibold leading-snug">
      {translatedHint ? (
        <span
          className={
            String(ticket.activityHint || ticket.activityLabel || "").includes("reject")
              ? "text-amber-800"
              : "text-blue-800"
          }
        >
          {translatedHint}
        </span>
      ) : (
        <>
          {ticket.customerReplied ? (
            <span className="text-blue-700">{t("ticketRow.customerReplied")}</span>
          ) : null}
          {ticket.internalNoteHint && !ticket.customerReplied ? (
            <span className="text-amber-800/90">{t("ticketRow.internalNote")}</span>
          ) : null}
        </>
      )}
    </p>
  );
}

export default function TicketRow({ ticket, selected, onSelect }) {
  const { t } = useTranslation("agent");
  const { t: tc } = useTranslation("common");

  const sla = getAgentSlaBarClasses(ticket.slaState);
  const listTimeLabel = formatAgentInboxRelativeTime(ticket.lastTouchIso, t);
  const categoryLabel = ticket.productName || ticket.customer || t("ticketRow.general");
  const isBreached = ticket.slaState === "Breached";
  const statusLabel = mapTicketStatusLabelI18n(ticket.statusCode || ticket.status, tc);
  const priorityLabel = mapPriorityLabelI18n(ticket.priorityCode || ticket.priority, tc);
  const slaStateLabel = mapSlaStateLabelI18n(ticket.slaState, t);

  return (
    <button
      type="button"
      data-testid="ticket-list-item"
      onClick={() => onSelect(ticket.id)}
      className={[
        "group relative w-full rounded-lg border bg-white text-left transition-[border-color,box-shadow] duration-150",
        "px-3 py-2.5 shadow-sm",
        selected
          ? "border-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,1)]"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md",
      ].join(" ")}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {ticket.resolutionDeclined ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 ring-1 ring-inset ring-amber-300/80 cursor-default"
                title={t("ticketRow.declinedTitle")}
                aria-label={t("ticketRow.declinedAria")}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-2.5 w-2.5 shrink-0 text-amber-700"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92ZM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-8a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-[10px] font-semibold text-amber-800 leading-none">
                  {t("ticketRow.declined")}
                </span>
              </span>
            ) : null}
            {ticket.unread > 0 ? (
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-2 ring-blue-200"
                title={t("ticketRow.unread")}
                aria-hidden
              />
            ) : null}
            <span className="truncate font-mono text-xs text-gray-500">
              {ticket.displayId ?? ticket.id}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {ticket.unread > 0 ? (
              <span className="min-w-[1.1rem] rounded-md bg-blue-100 px-1 py-0.5 text-center text-[10px] font-bold leading-none tabular-nums text-blue-800">
                {ticket.unread > 9 ? "9+" : ticket.unread}
              </span>
            ) : null}
            <span aria-hidden>
              <LinkOutIcon className="h-3 w-3 text-slate-300" />
            </span>
          </div>
        </div>

        <ActivityLine ticket={ticket} t={t} />

        <p
          className={[
            "mt-0.5 truncate text-left text-[15px] font-bold leading-snug text-slate-900",
            ticket.unread > 0 ? "text-slate-950" : "",
          ].join(" ")}
        >
          {ticket.title}
        </p>

        <p className="mt-0.5 truncate text-xs text-slate-500">
          <span className="text-slate-300" aria-hidden>
            —
          </span>{" "}
          {categoryLabel}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span
            className={`max-w-full truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none ${getAgentStatusClasses(ticket.statusCode || ticket.status)}`}
          >
            {statusLabel}
          </span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none ${getAgentPriorityClasses(ticket.priorityCode || ticket.priority)}`}
          >
            {priorityLabel}
          </span>
          {isBreached ? (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none ${sla.pill}`}
            >
              {slaStateLabel}
            </span>
          ) : null}
        </div>

        <div
          className={[
            "mt-2.5 overflow-hidden rounded-sm",
            isBreached ? "h-1.5 bg-red-100" : `h-1 rounded-full ${sla.track}`,
          ].join(" ")}
        >
          <div
            className={[
              "h-full transition-[width] duration-300",
              isBreached ? "w-full bg-red-500" : `rounded-full ${sla.fill}`,
            ].join(" ")}
            style={isBreached ? undefined : { width: `${sla.width}%` }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <AgentInboxSlaCountdown
            slaState={ticket.slaState}
            slaDue={ticket.slaDue}
            slaDueAt={ticket.slaDueAt}
            t={t}
          />
          <span className="shrink-0 text-xs tabular-nums text-slate-400">{listTimeLabel}</span>
        </div>
      </div>
    </button>
  );
}
