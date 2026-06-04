import {
  CUSTOMER_PRIORITY_PILL_BASE,
  CUSTOMER_STATUS_PILL_BASE,
  getCustomerStatusAccent,
  getCustomerStatusBadgeClass,
  getCustomerStatusLabel,
} from "../utils/customerStatusDisplay";

/*
 * TICKET CARD REHBER:
 * - Satır düzeni: TICKET_LIST_GRID (kolon genişlikleri burada).
 * - Hover satır rengi: hover:bg-slate-50
 * - Sol accent çizgi: statusAccent (duruma göre renk)
 * - "Open" butonu: satır içi aksiyon stili
 * - Status pill ve Priority pill: görsel hiyerarşi için ayrı tasarlandı
 */

/** Must match `TICKET_LIST_GRID` in CustomerMyTicketsView.jsx */
const TICKET_LIST_GRID =
  "grid grid-cols-[84px_minmax(0,1fr)_120px_180px_140px] items-center gap-x-4 px-5 py-3.5";

function formatRelativeShort(dateValue) {
  if (!dateValue) return "";
  const then = new Date(dateValue).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec  = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  return "";
}

export default function CustomerTicketCard({
  ticket,
  priorityClass,
  formatDate,
  onViewDetails,
  listTab,
  /** ISO timestamps of last seen server `updatedAt` per ticket id. */
}) {
  const lastTouch    = listTab === "PAST" ? ticket.closedAt || ticket.updatedAt : ticket.updatedAt || ticket.createdAt;
  const displayDate  = formatDate(lastTouch);
  const relative     = formatRelativeShort(lastTouch);
  const statusLabel  = getCustomerStatusLabel(ticket.status);
  const statusBadgeClass = getCustomerStatusBadgeClass(ticket.status);
  const statusAccent = getCustomerStatusAccent(ticket.status);

  return (
    <article
      className={`group/row relative ${TICKET_LIST_GRID} cursor-pointer transition-colors duration-150 hover:bg-slate-50`}
      onClick={() => onViewDetails?.(ticket.id)}
    >

      {/* ID */}
      <div className="justify-self-start self-center">
        <span className="inline-flex items-center rounded-customer-button bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-gray-600 ring-1 ring-inset ring-gray-200">
          #{ticket.id}
        </span>
      </div>

      {/* Title + status */}
      <div className="min-w-0 justify-self-stretch">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-[13.5px] font-semibold leading-snug tracking-tight text-gray-900 transition-colors duration-150 group-hover/row:text-gray-950">
            {ticket.title}
          </h3>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11.5px] leading-snug text-slate-500">
          <span className="truncate">{ticket.product?.name || "General request"}</span>
          <span aria-hidden className="text-slate-400">·</span>
          <span className={`${CUSTOMER_STATUS_PILL_BASE} ${statusBadgeClass}`}>
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusAccent }} />
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Priority */}
      <div className="flex min-h-[1.375rem] min-w-0 justify-center justify-self-center self-center">
        <span className={`${CUSTOMER_PRIORITY_PILL_BASE} ${priorityClass(ticket.priority)}`}>{ticket.priority}</span>
      </div>

      {/* Date */}
      <div className="min-w-0 justify-self-end self-center text-right">
        <p className="text-[12.5px] font-semibold leading-tight text-gray-900 tabular-nums">{displayDate}</p>
        {relative ? (
          <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{relative}</p>
        ) : null}
      </div>

      {/* Action: stretch last grid cell and align end to match “Action” header column */}
      <div className="flex w-full min-w-0 max-w-full justify-end justify-self-stretch self-center pr-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.(ticket.id);
          }}
          className="group/btn inline-flex h-8 w-[7.5rem] shrink-0 items-center justify-center gap-1 rounded-customer-button border border-gray-200 bg-white px-2 text-[12px] font-semibold text-gray-800 shadow-customer-card transition-colors duration-150 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600/40"
        >
          Open
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
