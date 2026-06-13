import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNotifications, markAllNotificationsRead, NOTIFICATIONS_BUMP_EVENT } from "../../../../../services/api";
import DataLoadErrorPanel from "../../../../shared/DataLoadErrorPanel";
import { DestrovaTableLoadingRow } from "../../../../shared/DestrovaLoading";
import { useManagerTicketsData } from "../../hooks/useManagerTicketsData";
import { isTicketCreatedToday, isTicketUnassignedRow } from "../../utils/dashboardAnalytics";
import { FILTER_ALL, normalizeManagerPriorityCode, normalizeManagerStatusCode } from "../../utils/managerFilterCodes";
import {
  buildPriorityFilterOptions,
  buildSlaFilterOptions,
  buildStatusFilterOptions,
  translateDashboardPresetLabel,
  translateManagerPriorityCode,
  translateManagerSlaCode,
  translateManagerStatusCode,
} from "../../utils/managerFilterI18n";
import { MANAGER_PAGE } from "../../managerTokens";
import ManagerStatusPill, { priorityKind, statusKind } from "../ManagerStatusPill";
import ManagerSurface from "../ManagerSurface";
import { useManagerWorkspace } from "../ManagerWorkspaceContext";
import DestrovaListPagination from "../../../shared/DestrovaListPagination";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function IconSearch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.65" />
      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconX({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

function FilterSelect({ id, label, value, options, onChange, className = "" }) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${MANAGER_PAGE.listFilterControl} shrink-0 px-2.5 ${className}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </>
  );
}

const PRIORITY_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1, High: 3, Medium: 2, Low: 1 };
const STATUS_RANK = {
  NEW: 5,
  IN_PROGRESS: 4,
  WAITING_FOR_CUSTOMER: 3,
  RESOLVED: 2,
  CLOSED: 1,
  New: 5,
  "In Progress": 4,
  "Waiting for Customer": 3,
  Resolved: 2,
  Closed: 1,
};
const SLA_RANK = { breached: 4, atRisk: 3, safe: 2, paused: 1 };

function priorityRank(t) {
  return PRIORITY_RANK[t.priorityCode] ?? PRIORITY_RANK[t.priority] ?? 0;
}

function statusRank(t) {
  return STATUS_RANK[t.statusCode] ?? STATUS_RANK[t.status] ?? 0;
}

/** Numeric ticket ID when possible — matches agent ticket list behavior. */
function ticketIdSortKey(t) {
  const raw = t.rawId ?? t.id;
  if (raw != null) {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw);
  }
  const label = String(t.displayId || t.id || "").trim();
  const match = label.match(/(\d+)(?!.*\d)/);
  if (match) return Number(match[1]);
  return label.toLowerCase();
}

const SORT_ACCESSORS = {
  ticket:   ticketIdSortKey,
  customer: (t) => (t.customer || "").toLowerCase(),
  priority: (t) => priorityRank(t),
  status:   (t) => statusRank(t),
  sla:      (t) => SLA_RANK[t.sla?.state] || 0,
  assignee: (t) => (t.assignee ? t.assignee.toLowerCase() : "~~~unassigned"),
  updated:  (t) => t.updatedRank ?? 0,
};

const DEFAULT_DIR = {
  ticket: "asc",
  customer: "asc",
  priority: "desc",
  status: "desc",
  sla: "desc",
  assignee: "asc",
  updated: "desc",
};

function compare(a, b) {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function defaultFilters() {
  return {
    status: FILTER_ALL,
    priority: FILTER_ALL,
    sla: FILTER_ALL,
  };
}

/** Column headers — customer My Tickets sort affordance. */
function SortHeader({ id, label, sort, onSort, align = "left" }) {
  const active = sort.key === id;
  const alignClass =
    align === "right"
      ? "justify-end text-right"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start text-left";
  return (
    <th scope="col" className={`px-5 py-2.5 font-normal ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onSort(id)}
        className={`flex w-full min-w-0 cursor-pointer appearance-none items-center gap-1 border-0 bg-transparent p-0 font-sans shadow-none outline-none ring-0 transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:ring-offset-0 ${alignClass} text-[11px] font-semibold uppercase tracking-[0.1em] ${active ? "text-gray-900" : "text-slate-500 hover:text-gray-900"}`}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{label}</span>
        {active ? (
          <span className="ml-0.5 shrink-0 text-[9px] font-normal leading-none text-slate-500" aria-hidden>
            {sort.dir === "asc" ? "▲" : "▼"}
          </span>
        ) : null}
      </button>
    </th>
  );
}

export default function ManagerAllTicketsView() {
  const { t } = useTranslation("manager");
  const { t: tc } = useTranslation("common");
  const {
    openTicket,
    customerFilter,
    setCustomerFilter,
    assigneeFilter,
    setAssigneeFilter,
    dashboardTicketPreset,
    clearDashboardTicketPreset,
  } = useManagerWorkspace();
  const { tickets, loading, loadFailed, error, refetch } = useManagerTicketsData();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [sort, setSort] = useState({ key: "updated", dir: "desc" });
  const [timeSegment, setTimeSegment] = useState("active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [unreadTicketIds, setUnreadTicketIds] = useState(() => new Set());
  const inputRef = useRef(null);
  const lastAppliedPresetRef = useRef(null);

  const statusFilterOptions = useMemo(() => buildStatusFilterOptions(t, tc), [t, tc]);
  const priorityFilterOptions = useMemo(() => buildPriorityFilterOptions(t, tc), [t, tc]);
  const slaFilterOptions = useMemo(() => buildSlaFilterOptions(t), [t]);

  useEffect(() => {
    if (!dashboardTicketPreset) {
      lastAppliedPresetRef.current = null;
      return;
    }
    const key = JSON.stringify(dashboardTicketPreset);
    if (lastAppliedPresetRef.current === key) {
      return;
    }
    lastAppliedPresetRef.current = key;
    setFilters({
      status: dashboardTicketPreset.status ?? FILTER_ALL,
      priority: dashboardTicketPreset.priority ?? FILTER_ALL,
      sla: dashboardTicketPreset.sla ?? FILTER_ALL,
    });
    if (dashboardTicketPreset.timeSegment) {
      setTimeSegment(dashboardTicketPreset.timeSegment);
    }
    setQuery("");
  }, [dashboardTicketPreset]);

  const refreshUnreadTicketIds = useCallback(async () => {
    try {
      const list = await getNotifications();
      if (!Array.isArray(list)) return;
      const next = new Set();
      for (const n of list) {
        if (n == null || n.read === true) continue;
        const tid = n.relatedTicketId;
        if (tid != null) next.add(String(tid));
      }
      setUnreadTicketIds(next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshUnreadTicketIds();
  }, [refreshUnreadTicketIds]);

  useEffect(() => {
    const onBump = () => void refreshUnreadTicketIds();
    window.addEventListener(NOTIFICATIONS_BUMP_EVENT, onBump);
    return () => window.removeEventListener(NOTIFICATIONS_BUMP_EVENT, onBump);
  }, [refreshUnreadTicketIds]);

  useEffect(() => {
    if (customerFilter) setQuery("");
  }, [customerFilter]);

  useEffect(() => {
    if (assigneeFilter != null) setQuery("");
  }, [assigneeFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, filters, sort, timeSegment, customerFilter, assigneeFilter, dashboardTicketPreset, pageSize]);

  const sortBy = (key) => {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      return { key, dir: DEFAULT_DIR[key] || "asc" };
    });
  };

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = tickets.filter((ticket) => {
      if (customerFilter && ticket.customer !== customerFilter) return false;
      if (assigneeFilter != null && String(ticket.assigneeId ?? "") !== String(assigneeFilter)) return false;
      if (q) {
        const hay = `${ticket.id} ${ticket.displayId ?? ""} ${ticket.title} ${ticket.customer} ${ticket.product || ""} ${ticket.assignee || "unassigned"}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status !== FILTER_ALL) {
        const code = ticket.statusCode ?? normalizeManagerStatusCode(ticket.status);
        if (code !== filters.status) return false;
      }
      if (filters.priority !== FILTER_ALL) {
        const code = ticket.priorityCode ?? normalizeManagerPriorityCode(ticket.priority);
        if (code !== filters.priority) return false;
      }
      if (filters.sla !== FILTER_ALL && ticket.sla?.state !== filters.sla) return false;
      if (dashboardTicketPreset?.assignee === "unassigned" && !isTicketUnassignedRow(ticket)) return false;
      if (dashboardTicketPreset?.createdToday && !isTicketCreatedToday(ticket.createdAtMs)) return false;
      return true;
    });

    const accessor = SORT_ACCESSORS[sort.key];
    if (accessor) {
      const factor = sort.dir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => factor * compare(accessor(a), accessor(b)));
    }
    return rows;
  }, [query, filters, sort, customerFilter, assigneeFilter, dashboardTicketPreset, tickets]);

  const activeCount = useMemo(
    () => filteredAndSorted.filter((t) => t.statusCode !== "CLOSED" && t.status !== "Closed").length,
    [filteredAndSorted],
  );
  const involvedCount = useMemo(
    () => filteredAndSorted.filter((t) => Boolean(t.mentionInvolved) && t.statusCode !== "CLOSED" && t.status !== "Closed").length,
    [filteredAndSorted],
  );
  const pastCount = useMemo(
    () => filteredAndSorted.filter((t) => t.statusCode === "CLOSED" || t.status === "Closed").length,
    [filteredAndSorted],
  );

  const hasActiveTableFilters =
    filters.status !== FILTER_ALL ||
    filters.priority !== FILTER_ALL ||
    filters.sla !== FILTER_ALL ||
    Boolean(query.trim()) ||
    Boolean(dashboardTicketPreset);

  const tableRows = useMemo(() => {
    if (timeSegment === "active") {
      return filteredAndSorted.filter((t) => t.statusCode !== "CLOSED" && t.status !== "Closed");
    }
    if (timeSegment === "involved") {
      return filteredAndSorted.filter(
        (t) => Boolean(t.mentionInvolved) && t.statusCode !== "CLOSED" && t.status !== "Closed",
      );
    }
    return filteredAndSorted.filter((t) => t.statusCode === "CLOSED" || t.status === "Closed");
  }, [filteredAndSorted, timeSegment]);

  const totalFilteredCount = tableRows.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, page, pageSize]);

  const rangeStart = totalFilteredCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalFilteredCount);

  const clearTableFilters = () => {
    setFilters(defaultFilters());
    setQuery("");
    clearDashboardTicketPreset();
    lastAppliedPresetRef.current = null;
  };

  const onSegmentChange = (segId) => {
    setTimeSegment(segId);
    if (segId === "involved") {
      void (async () => {
        try {
          await markAllNotificationsRead();
          setUnreadTicketIds(new Set());
          window.dispatchEvent(new CustomEvent(NOTIFICATIONS_BUMP_EVENT));
        } catch {
          /* ignore */
        }
      })();
    }
  };

  return (
    <ManagerSurface
      eyebrow={t("allTickets.eyebrow")}
      title={t("allTickets.title")}
      description={t("allTickets.description")}
    >
      <div className="flex min-w-0 flex-col gap-4">
        {(dashboardTicketPreset?.labelKey || dashboardTicketPreset?.label) ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-900">
            <span className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">{t("allTickets.dashboardBanner")}</span>
              <span className="font-semibold">{translateDashboardPresetLabel(dashboardTicketPreset, t)}</span>
            </span>
            <button
              type="button"
              onClick={clearTableFilters}
              className="rounded-full px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors duration-150 hover:bg-white/80"
            >
              {t("filters.clear")}
            </button>
          </div>
        ) : null}

        {assigneeFilter != null ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-900">
            <span className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">{t("allTickets.teamWorkloadBanner")}</span>
              <span className="font-semibold">{t("allTickets.filteredByAgent", { id: assigneeFilter })}</span>
            </span>
            <button
              type="button"
              onClick={() => setAssigneeFilter(null)}
              className="rounded-full px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors duration-150 hover:bg-white/80"
            >
              {t("filters.clear")}
            </button>
          </div>
        ) : null}

        {customerFilter ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-900">
            <span className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">{t("allTickets.filteredByLabel")}</span>
              <span className="font-semibold">{t("allTickets.filteredByCustomer", { name: customerFilter })}</span>
            </span>
            <button
              type="button"
              onClick={() => setCustomerFilter(null)}
              className="rounded-full px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors duration-150 hover:bg-white/80"
            >
              {t("filters.clear")}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label={t("allTickets.segmentAria")} className="destrova-segmented-tabs">
            {[
              { id: "active", label: t("allTickets.segments.active"), count: activeCount },
              { id: "involved", label: t("allTickets.segments.involved"), count: involvedCount },
              { id: "past", label: t("allTickets.segments.past"), count: pastCount },
            ].map((seg) => (
              <div key={seg.id} className="destrova-segmented-tabs__item">
                <button
                  type="button"
                  role="tab"
                  aria-selected={timeSegment === seg.id}
                  onClick={() => onSegmentChange(seg.id)}
                  className="destrova-segmented-tabs__label"
                >
                  <span>{seg.label}</span>
                  <span className="destrova-segmented-tabs__count">{seg.count}</span>
                </button>
              </div>
            ))}
          </div>
          <p className="hidden text-[11.5px] text-slate-500 md:block">
            {totalFilteredCount === 0 ? (
              t("allTickets.empty")
            ) : (
              t("allTickets.showing", { start: rangeStart, end: rangeEnd, total: totalFilteredCount })
            )}
          </p>
        </div>

        <div className="w-full min-w-0">
          <div className={MANAGER_PAGE.listFilterTray} role="toolbar" aria-label={t("allTickets.filterToolbar")}>
            <div className="flex shrink-0 items-center gap-1.5">
              <FilterSelect
                id="manager-all-tickets-status"
                label={t("filters.status")}
                value={filters.status}
                options={statusFilterOptions}
                onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                className="w-[9.25rem]"
              />
              <FilterSelect
                id="manager-all-tickets-priority"
                label={t("filters.priority")}
                value={filters.priority}
                options={priorityFilterOptions}
                onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
                className="w-[8.5rem]"
              />
              <FilterSelect
                id="manager-all-tickets-sla"
                label={t("filters.sla")}
                value={filters.sla}
                options={slaFilterOptions}
                onChange={(v) => setFilters((f) => ({ ...f, sla: v }))}
                className="w-[7.5rem]"
              />
            </div>
            <span className="mx-0.5 hidden h-6 w-px shrink-0 bg-slate-200/90 sm:block" aria-hidden />
            <label className="min-w-0 flex-1" htmlFor="manager-all-tickets-search">
              <span className="sr-only">{t("filters.searchPlaceholder")}</span>
              <div className="relative min-w-[10rem] w-full">
                <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  id="manager-all-tickets-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("allTickets.searchTablePlaceholder")}
                  aria-label={t("allTickets.searchAria")}
                  className={`${MANAGER_PAGE.listFilterControl} box-border h-9 w-full min-w-0 py-0 pl-8 pr-2.5 text-[13px] placeholder:text-slate-400`}
                />
              </div>
            </label>
            <button
              type="button"
              onClick={clearTableFilters}
              disabled={!hasActiveTableFilters}
              className={`${MANAGER_PAGE.listFilterClearBtn} shrink-0 ${
                hasActiveTableFilters
                  ? "text-gray-600 hover:bg-white hover:text-gray-900"
                  : "cursor-not-allowed text-slate-400/70"
              }`}
              title={t("allTickets.clearFilters")}
            >
              <IconX className="h-3 w-3" />
              {t("filters.clear")}
            </button>
          </div>
        </div>

        <div className={MANAGER_PAGE.ticketTableFrame}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/90">
                <tr>
                  <SortHeader id="ticket"   label={t("allTickets.columns.ticket")}   sort={sort} onSort={sortBy} />
                  <SortHeader id="customer" label={t("allTickets.columns.customer")} sort={sort} onSort={sortBy} />
                  <SortHeader id="priority" label={t("allTickets.columns.priority")} sort={sort} onSort={sortBy} />
                  <SortHeader id="status"   label={t("allTickets.columns.status")}   sort={sort} onSort={sortBy} />
                  <SortHeader id="sla"      label={t("allTickets.columns.sla")}      sort={sort} onSort={sortBy} />
                  <SortHeader id="assignee" label={t("allTickets.columns.assignee")} sort={sort} onSort={sortBy} />
                  <SortHeader id="updated"  label={t("allTickets.columns.updated")}  sort={sort} onSort={sortBy} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {loadFailed ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8">
                      <DataLoadErrorPanel
                        message={t("allTickets.loadFailed")}
                        error={error}
                        onRetry={refetch}
                      />
                    </td>
                  </tr>
                ) : loading ? (
                  <DestrovaTableLoadingRow
                    colSpan={7}
                    message={t("allTickets.loadingTickets")}
                  />
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                      {t("allTickets.noMatch")}
                    </td>
                  </tr>
                ) : null}
                {!loading && pagedRows.map((row) => {
                  const labelId = row.displayId || row.id;
                  const rowTicketKey = String(row.rawId ?? row.id);
                  const showUnreadBang =
                    timeSegment === "involved" && unreadTicketIds.has(rowTicketKey);
                  return (
                    <tr
                      key={row.id}
                      onClick={() => openTicket(row.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") openTicket(row.id); }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open ${labelId}`}
                      className="group/row cursor-pointer outline-none transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600/15"
                    >
                      <td className="px-5 py-3.5 align-top">
                        <p className="flex flex-wrap items-center gap-x-1.5">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-gray-600 ring-1 ring-inset ring-gray-200">
                            {labelId}
                          </span>
                          {showUnreadBang ? (
                            <span
                              className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
                              aria-label={t("allTickets.unreadAria")}
                              title={t("allTickets.unread")}
                            >
                              !
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 line-clamp-1 max-w-[24rem] text-[13.5px] font-semibold leading-snug tracking-tight text-gray-900 transition-colors duration-150 group-hover/row:text-gray-950">
                          {row.title}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 align-top text-[13px] text-gray-600">
                        {row.customer}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <ManagerStatusPill kind={priorityKind(row.priorityCode || row.priority)}>
                          {translateManagerPriorityCode(row.priorityCode || row.priority, tc)}
                        </ManagerStatusPill>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <ManagerStatusPill kind={statusKind(row.statusCode || row.status)}>
                          {translateManagerStatusCode(row.statusCode || row.status, tc)}
                        </ManagerStatusPill>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <ManagerStatusPill kind={row.sla.state}>
                          {translateManagerSlaCode(row.sla.state, t)}
                        </ManagerStatusPill>
                      </td>
                      <td className="px-5 py-3.5 align-top text-[13px] font-semibold text-gray-900">
                        {row.assignee || (
                          <span className="font-medium text-slate-500">{tc("ticket.noAssignee")}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top text-right text-[11.5px] tabular-nums text-slate-500">
                        {row.updatedAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && totalFilteredCount > 0 ? (
          <div className="flex flex-col items-center justify-between gap-3 pt-1 sm:flex-row">
            <DestrovaListPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              name="manager-all-tickets-page"
              ariaLabel="Ticket list pages"
            />
            <label className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-medium text-gray-600">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={`${MANAGER_PAGE.listFilterControl} h-7 px-1.5 text-[11px]`}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>
    </ManagerSurface>
  );
}
