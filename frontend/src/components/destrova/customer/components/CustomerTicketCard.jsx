import { useTranslation } from "react-i18next";
import { useFormatter } from "../../../../hooks/useFormatter";
import {
  CUSTOMER_PRIORITY_PILL_BASE,
  CUSTOMER_STATUS_PILL_BASE,
  getCustomerStatusAccent,
  getCustomerStatusBadgeClass,
  getCustomerStatusLabel,
} from "../utils/customerStatusDisplay";

const TICKET_LIST_GRID =
  "grid grid-cols-[84px_minmax(0,1fr)_120px_180px_140px] items-center gap-x-4 px-5 py-3.5";

export default function CustomerTicketCard({
  ticket,
  priorityClass,
  onViewDetails,
  listTab,
}) {
  const { t } = useTranslation("customer");
  const { t: tc } = useTranslation("common");
  const { formatRelativeTime, formatTicketListDate } = useFormatter();

  const lastTouch = listTab === "PAST" ? ticket.closedAt || ticket.updatedAt : ticket.updatedAt || ticket.createdAt;
  const displayDate = formatTicketListDate(lastTouch);
  const relative = formatRelativeTime(lastTouch);
  const statusLabel = getCustomerStatusLabel(ticket.status, t);
  const statusBadgeClass = getCustomerStatusBadgeClass(ticket.status);
  const statusAccent = getCustomerStatusAccent(ticket.status);

  const priorityKey = String(ticket.priority || "").toLowerCase();
  const priorityLabel =
    priorityKey === "high" || priorityKey === "medium" || priorityKey === "low"
      ? tc(`priority.${priorityKey}`)
      : ticket.priority;

  return (
    <article
      className={`group/row relative ${TICKET_LIST_GRID} cursor-pointer transition-colors duration-150 hover:bg-slate-50`}
      onClick={() => onViewDetails?.(ticket.id)}
    >
      <div className="justify-self-start self-center">
        <span className="inline-flex items-center rounded-customer-button bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-gray-600 ring-1 ring-inset ring-gray-200">
          #{ticket.id}
        </span>
      </div>

      <div className="min-w-0 justify-self-stretch">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-[13.5px] font-semibold leading-snug tracking-tight text-gray-900 transition-colors duration-150 group-hover/row:text-gray-950">
            {ticket.title}
          </h3>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11.5px] leading-snug text-slate-500">
          <span className="truncate">{ticket.product?.name || t("myTickets.generalRequest")}</span>
          <span aria-hidden className="text-slate-400">·</span>
          <span className={`${CUSTOMER_STATUS_PILL_BASE} ${statusBadgeClass}`}>
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusAccent }} />
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="flex min-h-[1.375rem] min-w-0 justify-center justify-self-center self-center">
        <span className={`${CUSTOMER_PRIORITY_PILL_BASE} ${priorityClass(ticket.priority)}`}>{priorityLabel}</span>
      </div>

      <div className="min-w-0 justify-self-end self-center text-right">
        <p className="text-[12.5px] font-semibold leading-tight text-gray-900 tabular-nums">{displayDate}</p>
        {relative ? (
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{relative}</p>
        ) : null}
      </div>

      <div className="flex w-full min-w-0 max-w-full justify-end justify-self-stretch self-center pr-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.(ticket.id);
          }}
          className="group/btn inline-flex h-8 w-[7.5rem] shrink-0 items-center justify-center gap-1 rounded-customer-button border border-gray-200 bg-white px-2 text-[12px] font-semibold text-gray-800 shadow-customer-card transition-colors duration-150 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600/40"
        >
          {t("myTickets.open")}
          <span
            className="text-[10px] text-slate-400 transition-[transform,color] duration-150 group-hover/btn:translate-x-0.5 group-hover/btn:text-blue-600"
            aria-hidden
          >
            →
          </span>
        </button>
      </div>
    </article>
  );
}
