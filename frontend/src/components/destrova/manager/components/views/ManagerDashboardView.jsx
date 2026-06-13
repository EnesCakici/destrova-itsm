import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useManagerDashboardData, DEFAULT_MANAGER_DASHBOARD_FILTERS } from "../../hooks/useManagerDashboardData";
import {
  buildDashboardFilterSuffix,
  DASHBOARD_KPI_TICKET_PRESETS,
  sanitizeDashboardProductFilter,
} from "../../utils/dashboardAnalytics";
import { FILTER_ALL, normalizeManagerPriorityCode } from "../../utils/managerFilterCodes";
import {
  buildPriorityFilterOptions,
  buildSlaFilterOptions,
  translateDashboardRangeId,
  translateManagerPriorityCode,
  translateManagerSlaCode,
  translateManagerPriorityFilterValue,
  translateManagerProductFilterValue,
  translateManagerStatusFilterValue,
} from "../../utils/managerFilterI18n";
import {
  buildManagerFlowHintText,
  formatManagerDashboardRelativeTime,
  formatManagerSlaDueLabel,
  translateManagerActivityActor,
  translateManagerActivityText,
} from "../../utils/managerDashboardFormat";
import {
  MANAGER_CHROME,
  MANAGER_COLORS,
  MANAGER_GHOST_BUTTON,
  MANAGER_PAGE,
  MANAGER_SHELL_LIST,
  MANAGER_STATUS,
} from "../../managerTokens";
import DataLoadErrorPanel from "../../../../shared/DataLoadErrorPanel";
import DashboardFilterBar from "../dashboard/DashboardFilterBar";
import DashboardProductBreakdown from "../dashboard/DashboardProductBreakdown";
import DashboardSlaPanel from "../dashboard/DashboardSlaPanel";
import DashboardTicketFlow from "../dashboard/DashboardTicketFlow";
import {
  DashboardChartSkeleton,
  DashboardKpiSkeletonRow,
  DashboardListSkeleton,
  DashboardQueueStripSkeleton,
  DashboardSidePanelSkeleton,
  DashboardTableSkeleton,
} from "../dashboard/DashboardSkeleton";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";
import ManagerFilterDropdown from "../ManagerFilterDropdown";
import ManagerKpiCard from "../ManagerKpiCard";
import ManagerStatusPill, { priorityKind } from "../ManagerStatusPill";
import ManagerSurface from "../ManagerSurface";
import { useManagerWorkspace } from "../ManagerWorkspaceContext";

/* ── Local helpers (kept inline — small + dashboard-only) ───── */

function WorkloadBar({ load, capacity }) {
  const pct = Math.min(100, Math.round((load / capacity) * 100));
  const color = pct >= 90 ? MANAGER_STATUS.breached.fg : pct >= 70 ? MANAGER_STATUS.atRisk.fg : MANAGER_COLORS.primary;
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900">
        {load}
        <span className="font-medium text-slate-400">/{capacity}</span>
      </span>
    </div>
  );
}

function QueueSegment({ label, value, accent }) {
  return (
    <div className="relative flex flex-1 flex-col gap-1.5 px-5 py-4">
      <span aria-hidden className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full" style={{ backgroundColor: accent || MANAGER_COLORS.primary }} />
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>{label}</p>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{value}</p>
    </div>
  );
}

function ActivityIcon({ kind }) {
  const w = "h-3.5 w-3.5";
  const stroke = "currentColor";
  switch (kind) {
    case "create":   return <svg viewBox="0 0 16 16" className={w} aria-hidden><path d="M8 3v10M3 8h10" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case "assign":   return <svg viewBox="0 0 16 16" className={w} aria-hidden><circle cx="6" cy="6" r="2.5" stroke={stroke} strokeWidth="1.4" fill="none" /><path d="M2 13c.8-2 2.4-3 4-3M11 7l2 2 3-3" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
    case "breached": return <svg viewBox="0 0 16 16" className={w} aria-hidden><path d="M8 2L1 14h14L8 2z" stroke={stroke} strokeWidth="1.4" fill="none" strokeLinejoin="round" /><path d="M8 6v4M8 12v.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" /></svg>;
    case "resolve":  return <svg viewBox="0 0 16 16" className={w} aria-hidden><circle cx="8" cy="8" r="6" stroke={stroke} strokeWidth="1.4" fill="none" /><path d="M5 8.5l2 2 4-4.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
    case "comment":  return <svg viewBox="0 0 16 16" className={w} aria-hidden><path d="M2.5 4.5h11v6h-5l-3 2.5v-2.5h-3v-6z" stroke={stroke} strokeWidth="1.4" fill="none" strokeLinejoin="round" /></svg>;
    case "reassign": return <svg viewBox="0 0 16 16" className={w} aria-hidden><path d="M3 6h8l-2-2M13 10H5l2 2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
    default: return null;
  }
}

function ActivityRow({ entry }) {
  const { t } = useTranslation("manager");
  const { t: tc } = useTranslation("common");
  const { openTicket } = useManagerWorkspace();
  const isAlert = entry.kind === "breached";
  const ticketId = entry.ticketId;
  const interactive = Boolean(ticketId);

  const iconWrapClass = isAlert
    ? "bg-red-50 text-red-600"
    : entry.kind === "resolve"
      ? "bg-emerald-50 text-emerald-600"
      : "bg-slate-50 text-slate-500";

  const rowClass =
    "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-slate-50";

  const handleOpen = () => {
    if (ticketId) openTicket(ticketId);
  };

  const handleKeyDown = (e) => {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  };

  const displayText = translateManagerActivityText(entry.text, t, tc);
  const displayActor = translateManagerActivityActor(entry.actor, t);
  const displayMeta = entry.metaIso
    ? formatManagerDashboardRelativeTime(entry.metaIso, t)
    : entry.meta;

  return (
    <li
      className={[
        rowClass,
        interactive ? "cursor-pointer focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/25" : "",
      ].join(" ")}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? handleOpen : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      aria-label={interactive ? `Open ticket ${ticketId}` : undefined}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconWrapClass}`}
      >
        <ActivityIcon kind={entry.kind} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-snug text-slate-900">{displayText}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{displayActor} · {displayMeta}</p>
      </div>
    </li>
  );
}

function TeamLoadRow({ user, onOpen }) {
  const { t } = useTranslation("manager");
  const pct = Math.min(100, Math.round((user.load / user.capacity) * 100));

  const roleLabel = user.roleKey === "atCapacity"
    ? t("dashboard.teamLoad.atCapacity")
    : user.roleKey === "pctOfCapacity"
      ? t("dashboard.teamLoad.pctOfCapacity", { pct: user.rolePct ?? pct })
      : user.role;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="cursor-pointer rounded-lg px-3 py-3 transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/25"
      aria-label={`View ${user.name} on team workload`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
        <p className="shrink-0 text-[11px] font-medium text-slate-500">
          {roleLabel}
        </p>
      </div>
      <div className="mt-2.5">
        <WorkloadBar load={user.load} capacity={user.capacity} />
      </div>
    </li>
  );
}

/* ── Critical tickets — local search + filter dropdown ──────────────── */
function IconSearchSm({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 13l-2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function IconFilterSm({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.5 4h11M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SlaTableCell({ sla, t }) {
  const dueLabel = formatManagerSlaDueLabel(sla.due, t);
  const showDue = dueLabel && dueLabel !== "—";
  const accent = MANAGER_STATUS[sla.state]?.fg ?? MANAGER_COLORS.muted;

  return (
    <div className="flex min-w-[5.75rem] flex-col items-start gap-1">
      <ManagerStatusPill kind={sla.state}>
        {translateManagerSlaCode(sla.state, t)}
      </ManagerStatusPill>
      {showDue ? (
        <span className="whitespace-nowrap text-[10px] font-semibold tabular-nums leading-none" style={{ color: accent }}>
          {dueLabel}
        </span>
      ) : null}
    </div>
  );
}

const UNASSIGNED_KEY = "__UNASSIGNED__";

function isCriticalTicket(t) {
  return (
    t.sla.state === "breached" ||
    t.sla.state === "atRisk" ||
    normalizeManagerPriorityCode(t.priority) === "HIGH"
  );
}

function CriticalTicketsCard({ filterSuffix, tickets }) {
  const { t } = useTranslation("manager");
  const { t: tc } = useTranslation("common");
  const { openTicket } = useManagerWorkspace();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState({ priority: FILTER_ALL, sla: FILTER_ALL, assignee: FILTER_ALL });

  const priorityOptions = useMemo(() => buildPriorityFilterOptions(t, tc), [t, tc]);
  const slaOptions = useMemo(() => buildSlaFilterOptions(t), [t]);

  const assigneePool = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const row of tickets) {
      if (!isCriticalTicket(row)) continue;
      const key = row.assignee || UNASSIGNED_KEY;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(key);
      }
    }
    list.sort((a, b) => (a === UNASSIGNED_KEY ? 1 : b === UNASSIGNED_KEY ? -1 : a.localeCompare(b)));
    return [FILTER_ALL, ...list];
  }, [tickets]);

  const assigneeOptions = useMemo(
    () =>
      assigneePool.map((value) => ({
        value,
        label:
          value === FILTER_ALL
            ? t("dashboard.critical.allAssignees")
            : value === UNASSIGNED_KEY
              ? t("dashboard.critical.unassigned")
              : value,
      })),
    [assigneePool, t],
  );

  const criticalTickets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((row) => {
      if (!isCriticalTicket(row)) return false;
      if (localFilters.priority !== FILTER_ALL && normalizeManagerPriorityCode(row.priority) !== localFilters.priority) {
        return false;
      }
      if (localFilters.sla !== FILTER_ALL && row.sla.state !== localFilters.sla) return false;
      const key = row.assignee || UNASSIGNED_KEY;
      if (localFilters.assignee !== FILTER_ALL && key !== localFilters.assignee) return false;
      if (q) {
        const hay = `${row.id} ${row.title} ${row.product} ${row.customer} ${row.assignee || "unassigned"}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).slice(0, 8);
  }, [query, localFilters, tickets]);

  const localActive =
    (localFilters.priority !== FILTER_ALL ? 1 : 0) +
    (localFilters.sla !== FILTER_ALL ? 1 : 0) +
    (localFilters.assignee !== FILTER_ALL ? 1 : 0);

  const hint = filterSuffix
    ? `${t("dashboard.critical.hintBase")} · ${filterSuffix}`
    : t("dashboard.critical.hintDefault");

  return (
    <ManagerCard className="lg:col-span-8" padding="p-6 md:p-7" tone="default" elevated>
      <ManagerCardHeader title={t("dashboard.critical.title")} hint={hint} />

      {/* Local search + filter button */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearchSm
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: MANAGER_COLORS.muted }}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dashboard.critical.searchPlaceholder")}
            aria-label={t("dashboard.critical.filters")}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs font-medium outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
            style={{
              color: MANAGER_COLORS.dark,
              boxShadow: MANAGER_CHROME.inputInset,
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-[background-color,color] duration-150"
          style={{
            color: filtersOpen || localActive > 0 ? "#FFFFFF" : MANAGER_COLORS.dark,
            backgroundColor: filtersOpen || localActive > 0 ? MANAGER_COLORS.primary : "rgba(255,255,255,0.9)",
            boxShadow: filtersOpen || localActive > 0 ? "none" : MANAGER_CHROME.inputInset,
          }}
          aria-expanded={filtersOpen}
        >
          <IconFilterSm className="h-3.5 w-3.5" />
          {t("dashboard.critical.filters")}
          {localActive > 0 ? (
            <span
              className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums"
              style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
            >
              {localActive}
            </span>
          ) : null}
        </button>
      </div>

      {filtersOpen ? (
        <div
          className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white/90 p-3 shadow-sm sm:grid-cols-3"
        >
          <ManagerFilterDropdown
            layout="stack"
            label={t("filters.priority")}
            value={localFilters.priority}
            options={priorityOptions}
            onChange={(v) => setLocalFilters((f) => ({ ...f, priority: v }))}
          />
          <ManagerFilterDropdown
            layout="stack"
            label={t("filters.sla")}
            value={localFilters.sla}
            options={slaOptions}
            onChange={(v) => setLocalFilters((f) => ({ ...f, sla: v }))}
          />
          <ManagerFilterDropdown
            layout="stack"
            label={t("allTickets.columns.assignee")}
            value={localFilters.assignee}
            options={assigneeOptions}
            onChange={(v) => setLocalFilters((f) => ({ ...f, assignee: v }))}
          />
        </div>
      ) : null}

      <div className="destrova-manager-feed-scroll mt-5 max-h-[650px] overflow-y-auto overflow-x-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
              <th className="pb-3 pr-4 font-semibold">{t("dashboard.critical.columns.ticket")}</th>
              <th className="pb-3 pr-4 font-semibold">{t("dashboard.critical.columns.assignee")}</th>
              <th className="pb-3 pr-4 font-semibold">{t("allTickets.columns.priority")}</th>
              <th className="pb-3 pr-4 font-semibold">{t("dashboard.critical.columns.sla")}</th>
              <th className="pb-3 font-semibold text-right">{t("dashboard.critical.columns.updated")}</th>
            </tr>
          </thead>
          <tbody>
              {criticalTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm" style={{ color: MANAGER_COLORS.support }}>
                    {t("dashboard.critical.emptyFilter")}
                  </td>
                </tr>
              ) : null}
              {criticalTickets.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openTicket(row.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") openTicket(row.id); }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ${row.id}`}
                  className="cursor-pointer outline-none transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-100"
                >
                  <td className="py-3 pr-4 align-top">
                    <p className="font-mono text-[11px] font-semibold tracking-tight" style={{ color: MANAGER_COLORS.muted }}>{row.id}</p>
                    <p className="mt-1 line-clamp-1 max-w-[24rem] text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{row.title}</p>
                  </td>
                  <td className="py-3 pr-4 align-top text-sm" style={{ color: MANAGER_COLORS.support }}>
                    {row.assignee || (
                      <span style={{ color: MANAGER_STATUS.atRisk.fg }} className="font-semibold">
                        {t("dashboard.critical.unassigned")}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <ManagerStatusPill kind={priorityKind(row.priority)}>
                      {translateManagerPriorityCode(normalizeManagerPriorityCode(row.priority), tc)}
                    </ManagerStatusPill>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <SlaTableCell sla={row.sla} t={t} />
                  </td>
                  <td className="py-3 align-top text-right text-xs tabular-nums" style={{ color: MANAGER_COLORS.muted }}>
                    {row.updatedAtIso
                      ? formatManagerDashboardRelativeTime(row.updatedAtIso, t)
                      : row.updatedAt}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </ManagerCard>
  );
}

/* ── View ─────────────────────────────────────────────── */
export default function ManagerDashboardView() {
  const { t } = useTranslation("manager");
  const { t: tc } = useTranslation("common");
  const { navigateTo } = useManagerWorkspace();
  const [filters, setFilters] = useState(DEFAULT_MANAGER_DASHBOARD_FILTERS);
  const { product, priority, status } = filters;

  const translatedFilterSuffix = useMemo(() => {
    const bits = buildDashboardFilterSuffix({ product, priority, status }, (kind, val) => {
      if (kind === "product") return translateManagerProductFilterValue(val, t);
      if (kind === "priority") return translateManagerPriorityFilterValue(val, t, tc);
      if (kind === "status") return translateManagerStatusFilterValue(val, t, tc);
      return val;
    });
    return bits ? `${t("dashboard.filteredPrefix")} ${bits}` : null;
  }, [product, priority, status, t, tc]);

  const translatedRangeLabel = useMemo(
    () => translateDashboardRangeId(filters.range, t),
    [filters.range, t],
  );

  const translatedFlowHint = useMemo(
    () => buildManagerFlowHintText(filters.range, product, priority, status, t, tc),
    [filters.range, product, priority, status, t, tc],
  );

  const openTicketsFromKpi = (presetKey) => {
    const preset = DASHBOARD_KPI_TICKET_PRESETS[presetKey];
    if (!preset) return;
    navigateTo("allTickets", { dashboardPreset: preset });
  };

  const {
    ranges,
    filterOptions,
    rangeLabel,
    queueNow,
    liveSignals,
    ticketFlow,
    dashboardFlowHint,
    slaHealth,
    slaInsight,
    teamSnapshot,
    productBreakdown,
    recentActivity,
    criticalTickets,
    filterSuffix,
    ticketsReady,
    capacityReady,
    loadFailed,
    error,
    refetch,
  } = useManagerDashboardData(filters);

  const filterSuffixDisplay = translatedFilterSuffix ?? filterSuffix;

  useEffect(() => {
    const nextProduct = sanitizeDashboardProductFilter(filters.product, filterOptions);
    if (nextProduct !== filters.product) {
      setFilters((prev) => ({ ...prev, product: nextProduct }));
    }
  }, [filterOptions, filters.product]);

  const productLabel = product !== FILTER_ALL ? product : null;

  const asOf = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <ManagerSurface
      hero
      eyebrow={t("dashboard.eyebrow")}
      title={t("dashboard.title")}
      description={t("dashboard.description")}
      actions={
        <span className={MANAGER_PAGE.heroBannerAction}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
          </span>
          {t("dashboard.liveAsOf", { time: asOf })}
        </span>
      }
    >
      {loadFailed ? (
        <DataLoadErrorPanel
          message={t("dashboard.loadFailed")}
          error={error}
          onRetry={refetch}
        />
      ) : null}

      {!loadFailed && ticketsReady && liveSignals && queueNow ? (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ManagerKpiCard
          tone={liveSignals.breached > 0 ? "breached" : "safe"}
          label={t("dashboard.kpi.slaBreaches")}
          value={liveSignals.breached}
          onClick={() => openTicketsFromKpi("slaBreaches")}
          delta={{
            dir: liveSignals.breached > 0 ? "up" : "flat",
            text: liveSignals.breached > 0
              ? t("dashboard.kpi.slaBreachesDeltaBad")
              : t("dashboard.kpi.slaBreachesDeltaOk"),
          }}
        />
        <ManagerKpiCard
          tone={liveSignals.atRisk > 0 ? "atRisk" : "safe"}
          label={t("dashboard.kpi.atRisk")}
          value={liveSignals.atRisk}
          onClick={() => openTicketsFromKpi("atRisk")}
          delta={{
            dir: liveSignals.atRisk > 0 ? "up" : "flat",
            text: liveSignals.atRiskUrgent > 0
              ? t("dashboard.kpi.atRiskDeltaUrgent", { count: liveSignals.atRiskUrgent })
              : t("dashboard.kpi.atRiskDeltaDefault"),
          }}
        />
        <ManagerKpiCard
          tone={liveSignals.unassigned > 0 ? "atRisk" : "safe"}
          label={t("dashboard.kpi.unassigned")}
          value={liveSignals.unassigned}
          onClick={() => openTicketsFromKpi("unassigned")}
          delta={{
            dir: "flat",
            text: liveSignals.unassigned > 0 ? t("dashboard.kpi.unassignedDeltaWaiting") : t("dashboard.kpi.unassignedDeltaOk"),
          }}
        />
        <ManagerKpiCard
          tone="primary"
          label={t("dashboard.kpi.newToday")}
          value={queueNow.newToday}
          onClick={() => openTicketsFromKpi("newToday")}
          delta={{
            dir: queueNow.resolvedToday >= queueNow.newToday ? "down" : "up",
            text: t("dashboard.kpi.resolvedToday", { count: queueNow.resolvedToday }),
          }}
        />
      </section>
      ) : loadFailed ? null : (
        <DashboardKpiSkeletonRow />
      )}

      {!loadFailed && ticketsReady && queueNow ? (
      <ManagerCard padding="p-0" tone="muted" topAccent={false}>
        <div className="flex flex-col divide-y divide-slate-200 sm:flex-row sm:divide-x sm:divide-y-0">
          <QueueSegment label={t("dashboard.queue.inProgress")} value={queueNow.inProgress} accent={MANAGER_COLORS.primary} />
          <QueueSegment label={t("dashboard.queue.waitingCustomer")} value={queueNow.waitingCustomer} accent={MANAGER_STATUS.atRisk.fg} />
          <QueueSegment label={t("dashboard.queue.resolvedToday")} value={queueNow.resolvedToday} accent={MANAGER_STATUS.safe.fg} />
        </div>
      </ManagerCard>
      ) : loadFailed ? null : (
        <DashboardQueueStripSkeleton />
      )}

      {!loadFailed ? (
      <section className="flex flex-col gap-4 border-t border-slate-200/90 pt-6" aria-labelledby="dashboard-filtered-analytics-heading">
        <div>
          <h2
            id="dashboard-filtered-analytics-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: MANAGER_COLORS.muted }}
          >
            {t("dashboard.filteredAnalytics")}
          </h2>
          <p className="mt-1 text-sm leading-snug" style={{ color: MANAGER_COLORS.support }}>
            {t("dashboard.filteredAnalyticsDesc")}
          </p>
        </div>

        <DashboardFilterBar
          filters={filters}
          onChange={setFilters}
          ranges={ranges}
          filterOptions={filterOptions}
        />

      {/* 4 ─ Ticket flow */}
      {ticketsReady && ticketFlow ? (
      <DashboardTicketFlow
        flowHint={translatedFlowHint}
        productLabel={productLabel}
        ticketFlow={ticketFlow}
        rangeLabel={translatedRangeLabel}
      />
      ) : (
        <DashboardChartSkeleton tall />
      )}

      {/* 5 ─ Critical work + SLA insight + Team load */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {ticketsReady && criticalTickets ? (
        <CriticalTicketsCard
          filterSuffix={filterSuffixDisplay}
          tickets={criticalTickets}
        />
        ) : (
          <div className="lg:col-span-8">
            <DashboardTableSkeleton rows={6} />
          </div>
        )}

        <div className="grid gap-6 lg:col-span-4">
          {ticketsReady && slaHealth ? (
          <DashboardSlaPanel slaHealth={slaHealth} slaInsight={slaInsight} />
          ) : (
            <DashboardSidePanelSkeleton />
          )}

          <ManagerCard padding="p-6 md:p-7" tone="default" elevated>
            <ManagerCardHeader
              title={t("dashboard.teamLoad.title")}
              hint={t("dashboard.teamLoad.hint")}
              action={
                <button
                  type="button"
                  onClick={() => navigateTo("teamWorkload")}
                  className={`manager-ghost-btn inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-tight text-blue-600 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-700 ${MANAGER_GHOST_BUTTON}`}
                >
                  {t("dashboard.teamLoad.viewAll")}
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              }
            />
            {capacityReady && Array.isArray(teamSnapshot) ? (
            teamSnapshot.length > 0 ? (
            <ul
              className={`${MANAGER_SHELL_LIST} destrova-manager-feed-scroll mt-4 max-h-[17.5rem] divide-y divide-slate-100 overflow-y-auto overscroll-contain pr-1`}
            >
              {teamSnapshot.map((u) => (
                <TeamLoadRow
                  key={u.id}
                  user={u}
                  onOpen={() => navigateTo("teamWorkload", { agentFocusId: u.id })}
                />
              ))}
            </ul>
            ) : (
              <p className="mt-4 text-sm" style={{ color: MANAGER_COLORS.support }}>
                {t("dashboard.teamLoad.noCapacityData")}
              </p>
            )
            ) : (
              <div className="mt-4">
                <DashboardListSkeleton rows={4} />
              </div>
            )}
          </ManagerCard>
        </div>
      </section>

      {/* 6 ─ Product breakdown + Recent activity (filtered / derived) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {ticketsReady && productBreakdown ? (
          <DashboardProductBreakdown
            rangeLabel={translatedRangeLabel}
            selectedProduct={product}
            productBreakdown={productBreakdown}
            filterSuffix={filterSuffixDisplay}
          />
          ) : (
            <DashboardChartSkeleton />
          )}
        </div>
        <ManagerCard className="lg:col-span-4" padding="p-6 md:p-7" tone="default" elevated>
          <ManagerCardHeader
            title={t("dashboard.activity.title")}
            hint={t("dashboard.activity.hint")}
            action={
              ticketsReady && recentActivity ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums tracking-tight text-slate-600">
                {t("dashboard.activity.eventCount", { count: recentActivity.length })}
              </span>
              ) : null
            }
          />
          {ticketsReady && recentActivity ? (
          <ul
            className={`${MANAGER_SHELL_LIST} destrova-manager-feed-scroll mt-3 max-h-[28rem] divide-y divide-slate-100 overflow-y-auto pr-1 [scrollbar-gutter:stable]`}
          >
            {recentActivity.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </ul>
          ) : (
            <div className="mt-3">
              <DashboardListSkeleton rows={5} />
            </div>
          )}
        </ManagerCard>
      </section>
      </section>
      ) : null}
    </ManagerSurface>
  );
}
