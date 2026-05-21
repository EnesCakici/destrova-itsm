import {
  getCustomerStatusAccent,
  getCustomerStatusBadgeClass,
  getCustomerStatusLabel,
} from "../utils/customerStatusDisplay";

/*
 * TICKET CARD REHBER:
 * - Satır düzeni: TICKET_LIST_GRID (kolon genişlikleri burada).
 * - Hover satır rengi: hover:bg-destrova-surfaceMuted/60
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

const statusPillBase =
  "inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium leading-tight";

const priorityPillBase =
  "inline-flex h-6 w-[4.75rem] shrink-0 items-center justify-center rounded-md border px-2 text-[10px] font-semibold uppercase tracking-[0.08em] tabular-nums leading-none";

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
      className={`group/row relative ${TICKET_LIST_GRID} cursor-pointer transition-all duration-150 hover:bg-destrova-surfaceMuted/60`}
      onClick={() => onViewDetails?.(ticket.id)}
    >

      {/* ID */}
      <div className="justify-self-start self-center">
        <span className="inline-flex items-center rounded-md bg-destrova-surfaceMuted px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-destrova-inkMuted ring-1 ring-inset ring-destrova-borderMuted">
          #{ticket.id}
        </span>
      </div>

      {/* Title + status */}
      <div className="min-w-0 justify-self-stretch">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-[13.5px] font-semibold leading-snug tracking-tight text-destrova-ink transition-colors duration-150 group-hover/row:text-destrova-inkStrong">
            {ticket.title}
          </h3>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11.5px] leading-snug text-destrova-inkSoft">
          <span className="truncate">{ticket.product?.name || "General request"}</span>
          <span aria-hidden className="text-destrova-inkFaint">·</span>
          <span className={`${statusPillBase} ${statusBadgeClass}`}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusAccent }} />
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Priority */}
      <div className="flex min-h-[2rem] min-w-0 justify-center justify-self-center self-center">
        <span className={`${priorityPillBase} ${priorityClass(ticket.priority)}`}>{ticket.priority}</span>
      </div>

      {/* Date */}
      <div className="min-w-0 justify-self-end self-center text-right">
        <p className="text-[12.5px] font-semibold leading-tight text-destrova-ink tabular-nums">{displayDate}</p>
        {relative ? (
          <p className="mt-0.5 text-[11px] leading-tight text-destrova-inkSoft">{relative}</p>
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
          className="group/btn inline-flex h-8 w-[7.5rem] shrink-0 items-center justify-center gap-1 rounded-md border border-[#cfcfe2] bg-gradient-to-b from-white to-[#f7f7fd] px-2 text-[12px] font-semibold text-[#3f3f6e] shadow-destrova-sm transition-all duration-150 hover:-translate-y-px hover:border-destrova-primary/40 hover:bg-destrova-primarySubtle hover:text-destrova-primary hover:shadow-destrova focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-destrova-primary/40"
        >
          Open
          <span
            className="text-[10px] text-destrova-inkFaint transition-[transform,color] duration-150 group-hover/btn:translate-x-0.5 group-hover/btn:text-destrova-primary"
            aria-hidden
          >
            →
          </span>
        </button>
      </div>
    </article>
  );
}
