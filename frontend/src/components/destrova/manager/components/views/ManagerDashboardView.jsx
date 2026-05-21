import { useMemo, useState } from "react";
import { useManagerDashboardData, DEFAULT_MANAGER_DASHBOARD_FILTERS } from "../../hooks/useManagerDashboardData";
import { MANAGER_COLORS, MANAGER_STATUS } from "../../managerTokens";
import DashboardFilterBar from "../dashboard/DashboardFilterBar";
import DashboardProductBreakdown from "../dashboard/DashboardProductBreakdown";
import DashboardSlaPanel from "../dashboard/DashboardSlaPanel";
import DashboardTicketFlow from "../dashboard/DashboardTicketFlow";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";
import ManagerKpiCard from "../ManagerKpiCard";
import ManagerStatusPill, { priorityKind } from "../ManagerStatusPill";
import ManagerSurface from "../ManagerSurface";
import { useManagerWorkspace } from "../ManagerWorkspaceContext";

/* ── Local helpers (kept inline — small + dashboard-only) ───── */

function WorkloadBar({ load, capacity }) {
  const pct = Math.min(100, Math.round((load / capacity) * 100));
  const color = pct >= 90 ? MANAGER_STATUS.breached.fg : pct >= 70 ? MANAGER_STATUS.atRisk.fg : MANAGER_COLORS.support;
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(39,39,87,0.08)" }}>
        <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>
        {load}
        <span style={{ color: MANAGER_COLORS.muted }} className="font-medium">/{capacity}</span>
      </span>
    </div>
  );
}

function QueueSegment({ label, value, accent }) {
  return (
    <div className="relative flex flex-1 flex-col gap-1.5 px-5 py-4">
      <span aria-hidden className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full" style={{ backgroundColor: accent || "rgba(39,39,87,0.18)" }} />
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>{label}</p>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{value}</p>
    </div>
  );
}

function ActivityIcon({ kind }) {
  const stroke = MANAGER_COLORS.support;
  const w = "h-3.5 w-3.5";
  switch (kind) {
    case "create":   return <svg viewBox="0 0 16 16" className={w} aria-hidden><path d="M8 3v10M3 8h10" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case "assign":   return <svg viewBox="0 0 16 16" className={w} aria-hidden><circle cx="6" cy="6" r="2.5" stroke={stroke} strokeWidth="1.4" fill="none" /><path d="M2 13c.8-2 2.4-3 4-3M11 7l2 2 3-3" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
    case "breached": return <svg viewBox="0 0 16 16" className={w} aria-hidden><path d="M8 2L1 14h14L8 2z" stroke={MANAGER_STATUS.breached.fg} strokeWidth="1.4" fill="none" strokeLinejoin="round" /><path d="M8 6v4M8 12v.5" stroke={MANAGER_STATUS.breached.fg} strokeWidth="1.4" strokeLinecap="round" /></svg>;
    case "resolve":  return <svg viewBox="0 0 16 16" className={w} aria-hidden><circle cx="8" cy="8" r="6" stroke={MANAGER_STATUS.safe.fg} strokeWidth="1.4" fill="none" /><path d="M5 8.5l2 2 4-4.5" stroke={MANAGER_STATUS.safe.fg} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
    case "comment":  return <svg viewBox="0 0 16 16" className={w} aria-hidden><path d="M2.5 4.5h11v6h-5l-3 2.5v-2.5h-3v-6z" stroke={stroke} strokeWidth="1.4" fill="none" strokeLinejoin="round" /></svg>;
    case "reassign": return <svg viewBox="0 0 16 16" className={w} aria-hidden><path d="M3 6h8l-2-2M13 10H5l2 2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
    default: return null;
  }
}

function ActivityRow({ entry }) {
  const { openTicket } = useManagerWorkspace();
  const isAlert = entry.kind === "breached";
  const ticketId = entry.ticketId;
  const interactive = Boolean(ticketId);

  const body = (
    <>
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: isAlert ? MANAGER_STATUS.breached.bg : "rgba(39,39,87,0.06)",
          boxShadow: "0 0 0 1px rgba(39,39,87,0.05) inset",
        }}
      >
        <ActivityIcon kind={entry.kind} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium" style={{ color: MANAGER_COLORS.dark }}>{entry.text}</p>
        <p className="mt-0.5 truncate text-[11px]" style={{ color: MANAGER_COLORS.muted }}>{entry.actor} · {entry.meta}</p>
      </div>
    </>
  );

  if (interactive) {
    return (
      <li>
        <button
          type="button"
          className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[rgba(39,39,87,0.07)]"
          onClick={() => openTicket(ticketId)}
          aria-label={`Open ticket ${ticketId}`}
        >
          {body}
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150">
      {body}
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
function IconChevronSm({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CRITICAL_PRIORITY = ["All", "High", "Medium", "Low"];
const CRITICAL_SLA = ["All", "Breached", "At risk", "Safe", "Paused"];
const SLA_STATE_FROM_LABEL = { Breached: "breached", "At risk": "atRisk", Safe: "safe", Paused: "paused" };

function CriticalTicketsCard({ priority, status, filterSuffix, tickets }) {
  const { openTicket } = useManagerWorkspace();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState({ priority: "All", sla: "All", assignee: "All" });

  // Distinct assignees in the critical pool — drives the assignee dropdown
  const assigneePool = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const t of tickets) {
      const isCritical = t.sla.state === "breached" || t.sla.state === "atRisk" || t.priority === "High";
      if (!isCritical) continue;
      const key = t.assignee || "Unassigned";
      if (!seen.has(key)) {
        seen.add(key);
        list.push(key);
      }
    }
    list.sort((a, b) => (a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)));
    return ["All", ...list];
  }, [tickets]);

  const criticalTickets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      const isCritical = t.sla.state === "breached" || t.sla.state === "atRisk" || t.priority === "High";
      if (!isCritical) return false;
      if (priority !== "All priorities" && t.priority !== priority) return false;
      if (status !== "All statuses" && t.status !== status) return false;
      if (localFilters.priority !== "All" && t.priority !== localFilters.priority) return false;
      if (localFilters.sla !== "All" && t.sla.state !== SLA_STATE_FROM_LABEL[localFilters.sla]) return false;
      const key = t.assignee || "Unassigned";
      if (localFilters.assignee !== "All" && key !== localFilters.assignee) return false;
      if (q) {
        const hay = `${t.id} ${t.title} ${t.product} ${t.customer} ${t.assignee || "unassigned"}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).slice(0, 8);
  }, [query, priority, status, localFilters, tickets]);

  const localActive =
    (localFilters.priority !== "All" ? 1 : 0) +
    (localFilters.sla !== "All" ? 1 : 0) +
    (localFilters.assignee !== "All" ? 1 : 0);

  return (
    <ManagerCard className="lg:col-span-8" padding="p-6 md:p-7" tone="accent" elevated>
      <ManagerCardHeader
        title="Critical tickets"
        hint={
          filterSuffix
            ? `High priority or SLA pressure · ${filterSuffix}`
            : "High priority or under SLA pressure — action recommended"
        }
      />

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
            placeholder="Filter critical: ID, title, product, customer, assignee"
            aria-label="Filter critical tickets"
            className="w-full rounded-lg border-0 bg-white py-2 pl-9 pr-3 text-xs font-medium outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)]"
            style={{
              color: MANAGER_COLORS.dark,
              boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-[background-color,color] duration-150"
          style={{
            color: filtersOpen || localActive > 0 ? MANAGER_COLORS.surface : MANAGER_COLORS.dark,
            backgroundColor: filtersOpen || localActive > 0 ? MANAGER_COLORS.dark : "rgba(255,255,255,0.7)",
            boxShadow: filtersOpen || localActive > 0 ? "none" : "0 0 0 1px rgba(39,39,87,0.08) inset",
          }}
          aria-expanded={filtersOpen}
        >
          <IconFilterSm className="h-3.5 w-3.5" />
          Filter
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
          className="mt-3 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-3"
          style={{
            backgroundColor: "rgba(255,255,255,0.7)",
            boxShadow: "0 0 0 1px rgba(39,39,87,0.06) inset",
          }}
        >
          <CriticalSelect
            label="Priority"
            value={localFilters.priority}
            options={CRITICAL_PRIORITY}
            onChange={(v) => setLocalFilters((f) => ({ ...f, priority: v }))}
          />
          <CriticalSelect
            label="SLA status"
            value={localFilters.sla}
            options={CRITICAL_SLA}
            onChange={(v) => setLocalFilters((f) => ({ ...f, sla: v }))}
          />
          <CriticalSelect
            label="Assignee"
            value={localFilters.assignee}
            options={assigneePool}
            onChange={(v) => setLocalFilters((f) => ({ ...f, assignee: v }))}
          />
        </div>
      ) : null}

      <div className="mt-5 max-h-[650px] overflow-y-auto overflow-x-auto pr-1 [scrollbar-gutter:stable]">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
              <th className="pb-3 pr-4 font-semibold">Ticket</th>
              <th className="pb-3 pr-4 font-semibold">Assignee</th>
              <th className="pb-3 pr-4 font-semibold">Priority</th>
              <th className="pb-3 pr-4 font-semibold">SLA</th>
              <th className="pb-3 font-semibold text-right">Updated</th>
            </tr>
          </thead>
          <tbody>
              {criticalTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm" style={{ color: MANAGER_COLORS.support }}>
                    No critical tickets match the current filters.
                  </td>
                </tr>
              ) : null}
              {criticalTickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openTicket(t.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") openTicket(t.id); }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ${t.id}`}
                  className="cursor-pointer outline-none transition-colors duration-150 hover:bg-[rgba(39,39,87,0.04)] focus-visible:bg-[rgba(39,39,87,0.06)]"
                >
                  <td className="py-3 pr-4 align-top">
                    <p className="font-mono text-[11px] font-semibold tracking-tight" style={{ color: MANAGER_COLORS.muted }}>{t.id}</p>
                    <p className="mt-1 line-clamp-1 max-w-[24rem] text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{t.title}</p>
                  </td>
                  <td className="py-3 pr-4 align-top text-sm" style={{ color: MANAGER_COLORS.support }}>
                    {t.assignee || <span style={{ color: MANAGER_STATUS.atRisk.fg }} className="font-semibold">Unassigned</span>}
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <ManagerStatusPill kind={priorityKind(t.priority)}>{t.priority}</ManagerStatusPill>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <ManagerStatusPill kind={t.sla.state}>{t.sla.label} · {t.sla.due}</ManagerStatusPill>
                  </td>
                  <td className="py-3 align-top text-right text-xs tabular-nums" style={{ color: MANAGER_COLORS.muted }}>{t.updatedAt}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </ManagerCard>
  );
}

function CriticalSelect({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-[10.5px]" style={{ color: MANAGER_COLORS.muted }}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border-0 bg-white px-3 py-2 pr-7 text-xs font-semibold outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)]"
          style={{
            color: MANAGER_COLORS.dark,
            boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset",
          }}
        >
          {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <IconChevronSm
          className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-70"
        />
      </div>
    </label>
  );
}

/* ── View ─────────────────────────────────────────────── */
export default function ManagerDashboardView() {
  const { navigateTo } = useManagerWorkspace();
  const [filters, setFilters] = useState(DEFAULT_MANAGER_DASHBOARD_FILTERS);
  const { product, priority, status } = filters;

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
  } = useManagerDashboardData(filters);

  const productLabel = product !== "All products" ? product : null;

  const asOf = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <ManagerSurface
      eyebrow="Live · Operations"
      title="Operations now"
      description="Filter, compare, and act. KPIs and charts respond to the controls below — the desk's real-time signals plus the trends behind them."
      actions={
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-tight"
          style={{
            color: MANAGER_COLORS.support,
            backgroundColor: "rgba(255,255,255,0.7)",
            boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(255,255,255,0.7) inset",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: MANAGER_STATUS.safe.fg }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: MANAGER_STATUS.safe.fg }} />
          </span>
          Live · as of {asOf}
        </span>
      }
    >
      {/* 1 ─ Unified filter bar */}
      <DashboardFilterBar
        filters={filters}
        onChange={setFilters}
        ranges={ranges}
        filterOptions={filterOptions}
      />

      {/* 2 ─ Primary KPIs — live "now" signals, what needs attention this minute */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ManagerKpiCard
          tone={liveSignals.breached > 0 ? "breached" : "safe"}
          label="SLA breaches now"
          value={liveSignals.breached}
          delta={{
            dir: liveSignals.breached > 0 ? "up" : "flat",
            text: liveSignals.breached > 0
              ? "Past SLA — fix immediately"
              : "All within SLA",
          }}
        />
        <ManagerKpiCard
          tone={liveSignals.atRisk > 0 ? "atRisk" : "safe"}
          label="At risk now"
          value={liveSignals.atRisk}
          delta={{
            dir: liveSignals.atRisk > 0 ? "up" : "flat",
            text: liveSignals.atRiskUrgent > 0
              ? `${liveSignals.atRiskUrgent} require action in next 2 hours`
              : "Approaching breach",
          }}
        />
        <ManagerKpiCard
          tone={liveSignals.unassigned > 0 ? "atRisk" : "safe"}
          label="Unassigned"
          value={liveSignals.unassigned}
          delta={{
            dir: "flat",
            text: liveSignals.unassigned > 0 ? "Waiting for routing" : "Fully routed",
          }}
        />
        <ManagerKpiCard
          tone="primary"
          label="New today"
          value={queueNow.newToday}
          delta={{
            dir: queueNow.resolvedToday >= queueNow.newToday ? "down" : "up",
            text: `${queueNow.resolvedToday} resolved today`,
          }}
        />
      </section>

      {/* 3 ─ Secondary metrics strip — live snapshot, no duplication of primary */}
      <ManagerCard padding="p-0" tone="muted" topAccent={false}>
        <div className="flex flex-col divide-y divide-[rgba(39,39,87,0.06)] sm:flex-row sm:divide-x sm:divide-y-0">
          <QueueSegment label="In progress" value={queueNow.inProgress} accent={MANAGER_COLORS.support} />
          <QueueSegment label="Waiting customer" value={queueNow.waitingCustomer} accent={MANAGER_STATUS.atRisk.fg} />
          <QueueSegment label="Resolved today" value={queueNow.resolvedToday} accent={MANAGER_STATUS.safe.fg} />
        </div>
      </ManagerCard>

      {/* 4 ─ Interactive ticket flow chart */}
      <DashboardTicketFlow
        flowHint={dashboardFlowHint}
        productLabel={productLabel}
        ticketFlow={ticketFlow}
      />

      {/* 5 ─ Critical work + SLA insight + Team load */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <CriticalTicketsCard
          priority={priority}
          status={status}
          filterSuffix={filterSuffix}
          tickets={criticalTickets}
        />

        <div className="grid gap-6 lg:col-span-4">
          <DashboardSlaPanel slaHealth={slaHealth} slaInsight={slaInsight} />

          <ManagerCard padding="p-6" tone="neutral">
            <ManagerCardHeader
              title="Team load right now"
              hint="Top assignees"
              action={
                <button
                  type="button"
                  onClick={() => navigateTo("teamWorkload")}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight transition-[background-color,color] duration-150 hover:bg-[rgba(39,39,87,0.08)]"
                  style={{ color: MANAGER_COLORS.dark }}
                >
                  View team workload
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              }
            />
            <ul className="mt-4 space-y-4">
              {teamSnapshot.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => navigateTo("teamWorkload", { agentFocusId: u.id })}
                    className="block w-full rounded-lg p-1 text-left transition-colors duration-150 hover:bg-[rgba(39,39,87,0.05)]"
                    aria-label={`View ${u.name} on team workload`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{u.name}</p>
                      <p className="text-[11px]" style={{ color: MANAGER_COLORS.muted }}>{u.role}</p>
                    </div>
                    <div className="mt-2">
                      <WorkloadBar load={u.load} capacity={u.capacity} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </ManagerCard>
        </div>
      </section>

      {/* 6 ─ Product breakdown + Recent activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <DashboardProductBreakdown
            rangeLabel={rangeLabel}
            selectedProduct={product}
            productBreakdown={productBreakdown}
          />
        </div>
        <ManagerCard className="lg:col-span-4" padding="p-6 md:p-7" tone="default" elevated>
          <ManagerCardHeader
            title="Recent activity"
            hint="Latest events across the desk"
            action={
              <span className="text-[11px] font-semibold tracking-tight" style={{ color: MANAGER_COLORS.support }}>
                {recentActivity.length} events
              </span>
            }
          />
          <ul className="mt-4 space-y-1">
            {recentActivity.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </ManagerCard>
      </section>
    </ManagerSurface>
  );
}
