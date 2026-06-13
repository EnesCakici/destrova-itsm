import { useTranslation } from "react-i18next";
import { DestrovaSlaMonitorSkeleton } from "../../../../shared/DestrovaLoading";
import DataLoadErrorPanel from "../../../../shared/DataLoadErrorPanel";
import { useSlaMonitorData } from "../../hooks/useSlaMonitorData";
import { MANAGER_CHROME, MANAGER_COLORS, MANAGER_STATUS } from "../../managerTokens";
import { normalizeManagerPriorityCode } from "../../utils/managerFilterCodes";
import {
  translateManagerPriorityCode,
  translateManagerSlaCode,
  translateManagerStatusCode,
} from "../../utils/managerFilterI18n";
import { formatManagerSlaMonitorDueLabel } from "../../utils/managerDashboardFormat";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";
import ManagerStatusPill, { priorityKind } from "../ManagerStatusPill";
import ManagerSurface from "../ManagerSurface";
import { useManagerWorkspace } from "../ManagerWorkspaceContext";

function SlaProgressBar({ pct, kind }) {
  const fill = MANAGER_STATUS[kind]?.fg || MANAGER_COLORS.support;
  const safePct = Math.max(2, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: MANAGER_CHROME.trackBg }}>
      <div
        className="h-full rounded-full transition-[width] duration-200"
        style={{ width: `${safePct}%`, backgroundColor: fill }}
      />
    </div>
  );
}

function SlaMetric({ label, value, kind }) {
  const accent = MANAGER_STATUS[kind]?.fg || MANAGER_COLORS.primary;
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
  const { t } = useTranslation("manager");
  const { t: tc } = useTranslation("common");
  const priorityCode = normalizeManagerPriorityCode(ticket.priorityCode || ticket.priority);
  const statusCode = ticket.statusCode || ticket.status;
  const assigneeLabel = ticket.assignee || t("slaMonitor.ticketLine.unassigned");
  const dueLabel = formatManagerSlaMonitorDueLabel(ticket.sla.due, ticket.sla.state, t);

  return (
    <li
      onClick={() => onOpen(ticket.id)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(ticket.id); }}
      tabIndex={0}
      role="button"
      aria-label={t("slaMonitor.ticketLine.openTicket", { id: ticket.id })}
      className="flex cursor-pointer flex-col gap-3 rounded-xl border border-transparent px-4 py-4 outline-none transition-colors duration-150 hover:border-gray-100 hover:bg-slate-50 focus-visible:border-blue-100 focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600/15 md:flex-row md:items-center md:gap-5 md:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold tracking-tight" style={{ color: MANAGER_COLORS.muted }}>{ticket.id}</span>
          <ManagerStatusPill kind={priorityKind(ticket.priority)}>
            {translateManagerPriorityCode(priorityCode, tc)}
          </ManagerStatusPill>
        </div>
        <p className="mt-1 line-clamp-1 text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{ticket.title}</p>
        <p className="mt-0.5 truncate text-xs" style={{ color: MANAGER_COLORS.muted }}>
          {ticket.customer} · {ticket.product ?? "—"} · {assigneeLabel} · {translateManagerStatusCode(statusCode, tc)}
        </p>
      </div>
      <div className="md:w-72">
        <div className="flex items-baseline justify-between gap-2">
          <ManagerStatusPill kind={ticket.sla.state}>
            {translateManagerSlaCode(ticket.sla.state, t)}
          </ManagerStatusPill>
          <span className="whitespace-nowrap text-xs font-semibold tabular-nums" style={{ color: MANAGER_COLORS.support }}>
            {dueLabel}
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
  const { t } = useTranslation("manager");
  const { openTicket } = useManagerWorkspace();
  const { loading, loadFailed, metPct, breached, atRisk, error, refetch } = useSlaMonitorData();
  const metLabel = metPct == null ? "—" : t("slaMonitor.onTimeValue", { pct: metPct });

  if (loadFailed) {
    return (
      <ManagerSurface
        eyebrow={t("slaMonitor.eyebrow")}
        title={t("slaMonitor.title")}
        description={t("slaMonitor.descriptionError")}
      >
        <DataLoadErrorPanel
          message={t("slaMonitor.loadFailed")}
          error={error}
          onRetry={refetch}
        />
      </ManagerSurface>
    );
  }

  if (loading) {
    return (
      <ManagerSurface
        eyebrow={t("slaMonitor.eyebrow")}
        title={t("slaMonitor.title")}
        description={t("slaMonitor.descriptionLoading")}
      >
        <DestrovaSlaMonitorSkeleton />
      </ManagerSurface>
    );
  }

  return (
    <ManagerSurface
      eyebrow={t("slaMonitor.eyebrow")}
      title={t("slaMonitor.title")}
      description={t("slaMonitor.description")}
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SlaMetric label={t("slaMonitor.metrics.onTime")} value={metLabel} kind="safe" />
        <SlaMetric label={t("slaMonitor.metrics.atRisk")} value={atRisk.length} kind="atRisk" />
        <SlaMetric label={t("slaMonitor.metrics.breached")} value={breached.length} kind="breached" />
      </section>

      <ManagerCard padding="p-6 md:p-7" tone="breached" elevated>
        <ManagerCardHeader
          title={t("slaMonitor.breached.title")}
          hint={
            breached.length === 0
              ? t("slaMonitor.breached.hintZero")
              : t("slaMonitor.breached.hint", { count: breached.length })
          }
        />
        {breached.length === 0 ? (
          <p className="mt-6 text-sm" style={{ color: MANAGER_COLORS.support }}>{t("slaMonitor.breached.empty")}</p>
        ) : (
          <div className="destrova-manager-feed-scroll mt-4 min-h-0 max-h-[360px] overflow-y-auto overflow-x-hidden pr-0.5">
            <ul className="space-y-1">
              {breached.map((ticket) => (
                <TicketLine key={ticket.id} ticket={ticket} onOpen={openTicket} />
              ))}
            </ul>
          </div>
        )}
      </ManagerCard>

      <ManagerCard padding="p-6 md:p-7" tone="atRisk" elevated>
        <ManagerCardHeader
          title={t("slaMonitor.atRisk.title")}
          hint={
            atRisk.length === 0
              ? t("slaMonitor.atRisk.hintZero")
              : t("slaMonitor.atRisk.hint", { count: atRisk.length })
          }
        />
        {atRisk.length === 0 ? (
          <p className="mt-6 text-sm" style={{ color: MANAGER_COLORS.support }}>{t("slaMonitor.atRisk.empty")}</p>
        ) : (
          <div className="destrova-manager-feed-scroll mt-4 min-h-0 max-h-[360px] overflow-y-auto overflow-x-hidden pr-0.5">
            <ul className="space-y-1">
              {atRisk.map((ticket) => (
                <TicketLine key={ticket.id} ticket={ticket} onOpen={openTicket} />
              ))}
            </ul>
          </div>
        )}
      </ManagerCard>
    </ManagerSurface>
  );
}
