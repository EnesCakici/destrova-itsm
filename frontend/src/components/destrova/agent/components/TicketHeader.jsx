/**
 * Compact enterprise ticket context — workflow strip, title, labeled meta chips.
 * Status/priority editing lives in {@link RightRail}.
 */
import { useTranslation } from "react-i18next";
import {
  getAgentPriorityClasses,
  getAgentSlaBarClasses,
  getAgentStatusClasses,
} from "../agentTokens.js";
import {
  mapPriorityLabelI18n,
  mapSlaStateLabelI18n,
  mapTicketStatusLabelI18n,
} from "../mappers/agentTicketMappers";
import { formatAgentInboxSlaFooter } from "../utils/agentInboxFormat";

function ContextChip({ className = "", children, ...rest }) {
  return (
    <span
      {...rest}
      className={[
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none ring-1 ring-inset ring-black/[0.04]",
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function MetaChip({ label, value, secondary = null }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 ring-1 ring-inset ring-slate-200/70">
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      <span className="min-w-0 truncate text-[11px] font-medium text-slate-700">{value}</span>
      {secondary ? (
        <>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <span className="min-w-0 truncate text-[11px] text-slate-500">{secondary}</span>
        </>
      ) : null}
    </span>
  );
}

export default function TicketHeader({ detail, metaError = "" }) {
  const { t } = useTranslation("agent");
  const { t: tc } = useTranslation("common");

  if (!detail) return null;

  const statusClass = getAgentStatusClasses(detail.statusCode || detail.status);
  const priorityClass = getAgentPriorityClasses(detail.priorityCode || detail.priority);
  const sla = detail.slaState ? getAgentSlaBarClasses(detail.slaState) : null;
  const slaDueLabel = formatAgentInboxSlaFooter(
    detail.slaState,
    detail.slaDue,
    t,
    detail.slaDueAt,
  );
  const product =
    detail.productName != null && String(detail.productName).trim() !== ""
      ? String(detail.productName).trim()
      : t("ticketHeader.general");

  const statusLabel = mapTicketStatusLabelI18n(detail.statusCode || detail.status, tc);
  const priorityLabel = mapPriorityLabelI18n(detail.priorityCode || detail.priority, tc);
  const slaStateLabel = detail.slaState ? mapSlaStateLabelI18n(detail.slaState, t) : null;

  return (
    <header className="shrink-0 border-b border-slate-200/90 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100/90 bg-slate-50/70 px-3.5 py-1.5 sm:px-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="inline-flex shrink-0 items-center rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200/80">
            {detail.id}
          </span>
          <ContextChip className={statusClass} data-testid="agent-ticket-status">
            {statusLabel}
          </ContextChip>
          <ContextChip className={priorityClass}>{priorityLabel}</ContextChip>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {sla ? (
            <div
              className={[
                "inline-flex max-w-[12rem] items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none sm:max-w-none",
                sla.pill,
              ].join(" ")}
              title={[slaStateLabel, slaDueLabel].filter(Boolean).join(" · ")}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sla.dot}`} aria-hidden />
              <span className="font-semibold uppercase tracking-[0.08em] opacity-75">
                {t("rightRail.sla")}
              </span>
              <span className="font-semibold">{slaStateLabel}</span>
              {slaDueLabel ? (
                <>
                  <span className="opacity-50" aria-hidden>
                    ·
                  </span>
                  <span className="truncate">{slaDueLabel}</span>
                </>
              ) : null}
            </div>
          ) : null}
          {metaError ? (
            <p
              className="max-w-[12rem] rounded-md border border-red-100 bg-red-50 px-1.5 py-0.5 text-right text-[10px] leading-snug text-red-800 sm:max-w-xs"
              role="alert"
            >
              {metaError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="px-3.5 py-2 sm:px-4">
        <h1 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-slate-900 sm:text-lg">
          {detail.title}
        </h1>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <MetaChip label={t("ticketHeader.product")} value={product} />
          <MetaChip label={t("ticketHeader.opened")} value={detail.openedAt} />
          <MetaChip label={t("ticketHeader.updated")} value={detail.updatedAt} />
        </div>
      </div>
    </header>
  );
}
