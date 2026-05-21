import { useSlaMonitorData } from "../../hooks/useSlaMonitorData";
import { MANAGER_COLORS, MANAGER_STATUS } from "../../managerTokens";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";
import ManagerStatusPill, { priorityKind } from "../ManagerStatusPill";
import ManagerSurface from "../ManagerSurface";
import { useManagerWorkspace } from "../ManagerWorkspaceContext";

function SlaProgressBar({ pct, kind }) {
  const fill = MANAGER_STATUS[kind]?.fg || MANAGER_COLORS.support;
  const safePct = Math.max(2, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(39,39,87,0.08)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-200"
        style={{ width: `${safePct}%`, backgroundColor: fill }}
      />
    </div>
  );
}

function SlaMetric({ label, value, kind }) {
  const accent = MANAGER_STATUS[kind]?.fg || MANAGER_COLORS.dark;
  return (
    <ManagerCard padding="p-6" tone={kind} interactive>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>
        {label}
      </p>
      <p className="mt-4 text-[34px] font-semibold leading-none tracking-tight tabular-nums md:text-[40px]" style={{ color: accent }}>
        {value}
      </p>
    </ManagerCard>
  );
}

function TicketLine({ ticket, onOpen }) {
  return (
    <li
      onClick={() => onOpen(ticket.id)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(ticket.id); }}
      tabIndex={0}
      role="button"
      aria-label={`Open ${ticket.id}`}
      className="flex cursor-pointer flex-col gap-3 rounded-xl px-4 py-4 outline-none transition-colors duration-150 hover:bg-[rgba(39,39,87,0.03)] focus-visible:bg-[rgba(39,39,87,0.06)] md:flex-row md:items-center md:gap-5 md:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-tight" style={{ color: MANAGER_COLORS.muted }}>{ticket.id}</span>
          <ManagerStatusPill kind={priorityKind(ticket.priority)}>{ticket.priority}</ManagerStatusPill>
        </div>
        <p className="mt-1 line-clamp-1 text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{ticket.title}</p>
        <p className="mt-0.5 truncate text-xs" style={{ color: MANAGER_COLORS.muted }}>
          {ticket.customer} · {ticket.product ?? "—"} · {ticket.assignee || "Unassigned"} · {ticket.status ?? "—"}
        </p>
      </div>
      <div className="md:w-72">
        <div className="flex items-baseline justify-between gap-2">
          <ManagerStatusPill kind={ticket.sla.state}>{ticket.sla.label}</ManagerStatusPill>
          <span className="text-xs font-semibold tabular-nums" style={{ color: MANAGER_COLORS.support }}>
            {ticket.sla.due}
          </span>
        </div>
        <div className="mt-2">
          <SlaProgressBar pct={ticket.sla.remainingPct} kind={ticket.sla.state} />
        </div>
      </div>
    </li>
  );
}

export default function ManagerSlaMonitorView() {
  const { openTicket } = useManagerWorkspace();
  const { loading, metPct, breached, atRisk } = useSlaMonitorData();
  const metLabel = metPct == null ? "—" : `${metPct}%`;

  return (
    <ManagerSurface
      eyebrow="SLA"
      title="SLA monitor"
      description={
        loading
          ? "Loading SLA data from the desk…"
          : "Where the desk is under pressure right now. Action focuses on the breach list first, then at-risk."
      }
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SlaMetric label="Met" value={metLabel} kind="safe" />
        <SlaMetric label="At risk" value={atRisk.length} kind="atRisk" />
        <SlaMetric label="Breached" value={breached.length} kind="breached" />
      </section>

      <ManagerCard padding="p-6 md:p-7" tone="accent" elevated>
        <ManagerCardHeader title="Breached" hint={`${breached.length} ticket${breached.length === 1 ? "" : "s"} require immediate attention`} />
        {breached.length === 0 ? (
          <p className="mt-6 text-sm" style={{ color: MANAGER_COLORS.support }}>No breached tickets. The desk is clear.</p>
        ) : (
          <div className="mt-4 min-h-0 max-h-[360px] overflow-y-auto overflow-x-hidden pr-0.5">
            <ul className="space-y-1">
              {breached.map((t) => (
                <TicketLine key={t.id} ticket={t} onOpen={openTicket} />
              ))}
            </ul>
          </div>
        )}
      </ManagerCard>

      <ManagerCard padding="p-6 md:p-7" tone="primary">
        <ManagerCardHeader title="At risk" hint={`${atRisk.length} ticket${atRisk.length === 1 ? "" : "s"} approaching SLA breach`} />
        {atRisk.length === 0 ? (
          <p className="mt-6 text-sm" style={{ color: MANAGER_COLORS.support }}>Nothing approaching breach.</p>
        ) : (
          <div className="mt-4 min-h-0 max-h-[360px] overflow-y-auto overflow-x-hidden pr-0.5">
            <ul className="space-y-1">
              {atRisk.map((t) => (
                <TicketLine key={t.id} ticket={t} onOpen={openTicket} />
              ))}
            </ul>
          </div>
        )}
      </ManagerCard>
    </ManagerSurface>
  );
}
