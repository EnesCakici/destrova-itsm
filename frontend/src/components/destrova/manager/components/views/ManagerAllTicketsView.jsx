import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNotifications, markAllNotificationsRead, NOTIFICATIONS_BUMP_EVENT } from "../../../../../services/api";
import { useManagerTicketsData } from "../../hooks/useManagerTicketsData";
import { isTicketCreatedToday, isTicketUnassignedRow } from "../../utils/dashboardAnalytics";
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
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </>
  );
}

const SLA_FILTER_TO_STATE = {
  Safe: "safe",
  "At risk": "atRisk",
  Breached: "breached",
  Paused: "paused",
};

const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };
const STATUS_RANK   = { New: 5, "In Progress": 4, "Waiting for Customer": 3, Resolved: 2, Closed: 1 };
const SLA_RANK      = { breached: 4, atRisk: 3, safe: 2, paused: 1 };

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
  priority: (t) => PRIORITY_RANK[t.priority] || 0,
  status:   (t) => STATUS_RANK[t.status] || 0,
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

function defaultFilters(filterOptions) {
  return {
    status: filterOptions.status?.[0] || "All statuses",
    priority: filterOptions.priority?.[0] || "All priorities",
    sla: filterOptions.sla?.[0] || "All SLA",
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
  const {
    openTicket,
    customerFilter,
    setCustomerFilter,
    assigneeFilter,
    setAssigneeFilter,
    dashboardTicketPreset,
    clearDashboardTicketPreset,
  } = useManagerWorkspace();
  const { tickets, filterOptions, loading } = useManagerTicketsData();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(() => defaultFilters(filterOptions));
  const [sort, setSort] = useState({ key: "updated", dir: "desc" });
  const [timeSegment, setTimeSegment] = useState("active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [unreadTicketIds, setUnreadTicketIds] = useState(() => new Set());
  const inputRef = useRef(null);
  const lastAppliedPresetRef = useRef(null);

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
      status: dashboardTicketPreset.status ?? filterOptions.status?.[0] ?? "All statuses",
      priority: dashboardTicketPreset.priority ?? filterOptions.priority?.[0] ?? "All priorities",
      sla: dashboardTicketPreset.sla ?? filterOptions.sla?.[0] ?? "All SLA",
    });
    if (dashboardTicketPreset.timeSegment) {
      setTimeSegment(dashboardTicketPreset.timeSegment);
    }
    setQuery("");
  }, [dashboardTicketPreset, filterOptions]);

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
    let rows = tickets.filter((t) => {
      if (customerFilter && t.customer !== customerFilter) return false;
      if (assigneeFilter != null && String(t.assigneeId ?? "") !== String(assigneeFilter)) return false;
      if (q) {
        const hay = `${t.id} ${t.displayId ?? ""} ${t.title} ${t.customer} ${t.product || ""} ${t.assignee || "unassigned"}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (!filters.status.startsWith("All") && t.status !== filters.status) return false;
      if (!filters.priority.startsWith("All") && t.priority !== filters.priority) return false;
      if (!filters.sla.startsWith("All") && t.sla.state !== SLA_FILTER_TO_STATE[filters.sla]) return false;
      if (dashboardTicketPreset?.assignee === "unassigned" && !isTicketUnassignedRow(t)) return false;
      if (dashboardTicketPreset?.createdToday && !isTicketCreatedToday(t.createdAtMs)) return false;
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
    () => filteredAndSorted.filter((t) => t.status !== "Closed").length,
    [filteredAndSorted],
  );
  const involvedCount = useMemo(
    () => filteredAndSorted.filter((t) => Boolean(t.mentionInvolved) && t.status !== "Closed").length,
    [filteredAndSorted],
  );
  const pastCount = useMemo(
    () => filteredAndSorted.filter((t) => t.status === "Closed").length,
    [filteredAndSorted],
  );

  const hasActiveTableFilters =
    !filters.status.startsWith("All") ||
    !filters.priority.startsWith("All") ||
    !filters.sla.startsWith("All") ||
    Boolean(query.trim()) ||
    Boolean(dashboardTicketPreset);

  const tableRows = useMemo(() => {
    if (timeSegment === "active") {
      return filteredAndSorted.filter((t) => t.status !== "Closed");
    }
    if (timeSegment === "involved") {
      return filteredAndSorted.filter((t) => Boolean(t.mentionInvolved) && t.status !== "Closed");
    }
    return filteredAndSorted.filter((t) => t.status === "Closed");
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
    setFilters(defaultFilters(filterOptions));
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
      eyebrow="Operations"
      title="All tickets"
      description="Every ticket across the system. Search, filter, and inspect in seconds."
    >
      <div className="flex min-w-0 flex-col gap-4">
        {dashboardTicketPreset?.label ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-900">
            <span className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">Dashboard:</span>
              <span className="font-semibold">{dashboardTicketPreset.label}</span>
            </span>
            <button
              type="button"
              onClick={clearTableFilters}
              className="rounded-full px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors duration-150 hover:bg-white/80"
            >
              Clear
            </button>
          </div>
        ) : null}

        {assigneeFilter != null ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-900">
            <span className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">Team workload:</span>
              <span className="font-semibold">Filtered by agent · ID {assigneeFilter}</span>
            </span>
            <button
              type="button"
              onClick={() => setAssigneeFilter(null)}
              className="rounded-full px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors duration-150 hover:bg-white/80"
            >
              Clear
            </button>
          </div>
        ) : null}

        {customerFilter ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-900">
            <span className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">Filtered by:</span>
              <span className="font-semibold">Customer · {customerFilter}</span>
            </span>
            <button
              type="button"
              onClick={() => setCustomerFilter(null)}
              className="rounded-full px-2 py-1 text-[11px] font-semibold text-gray-600 transition-colors duration-150 hover:bg-white/80"
            >
              Clear
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Ticket list segment" className="destrova-segmented-tabs">
            {[
              { id: "active", label: "Active tickets", count: activeCount },
              { id: "involved", label: "Involved", count: involvedCount },
              { id: "past", label: "Past tickets", count: pastCount },
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
              "No tickets in this view"
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold text-gray-700 tabular-nums">
                  {rangeStart}–{rangeEnd}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700 tabular-nums">{totalFilteredCount}</span>
              </>
            )}
          </p>
        </div>

        <div className="w-full min-w-0">
          <div className={MANAGER_PAGE.listFilterTray} role="toolbar" aria-label="Filter All Tickets table">
            <div className="flex shrink-0 items-center gap-1.5">
              <FilterSelect
                id="manager-all-tickets-status"
                label="Status"
                value={filters.status}
                options={filterOptions.status}
                onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                className="w-[9.25rem]"
              />
              <FilterSelect
                id="manager-all-tickets-priority"
                label="Priority"
                value={filters.priority}
                options={filterOptions.priority}
                onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
                className="w-[8.5rem]"
              />
              <FilterSelect
                id="manager-all-tickets-sla"
                label="SLA"
                value={filters.sla}
                options={filterOptions.sla}
                onChange={(v) => setFilters((f) => ({ ...f, sla: v }))}
                className="w-[7.5rem]"
              />
            </div>
            <span className="mx-0.5 hidden h-6 w-px shrink-0 bg-slate-200/90 sm:block" aria-hidden />
            <label className="min-w-0 flex-1" htmlFor="manager-all-tickets-search">
              <span className="sr-only">Search this table</span>
              <div className="relative min-w-[10rem] w-full">
                <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  id="manager-all-tickets-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search id, title, customer, product, or assignee"
                  aria-label="Search All Tickets table"
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
              title="Clear table filters"
            >
              <IconX className="h-3 w-3" />
              Clear
            </button>
          </div>
        </div>

        <div className={MANAGER_PAGE.ticketTableFrame}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/90">
                <tr>
                  <SortHeader id="ticket"   label="Ticket"   sort={sort} onSort={sortBy} />
                  <SortHeader id="customer" label="Customer" sort={sort} onSort={sortBy} />
                  <SortHeader id="priority" label="Priority" sort={sort} onSort={sortBy} />
                  <SortHeader id="status"   label="Status"   sort={sort} onSort={sortBy} />
                  <SortHeader id="sla"      label="SLA"      sort={sort} onSort={sortBy} />
                  <SortHeader id="assignee" label="Assignee" sort={sort} onSort={sortBy} />
                  <SortHeader id="updated"  label="Updated"  sort={sort} onSort={sortBy} align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                      <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                      <p className="mt-3">Loading tickets…</p>
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                      No tickets match this view.
                    </td>
                  </tr>
                ) : null}
                {!loading && pagedRows.map((t) => {
                  const labelId = t.displayId || t.id;
                  const rowTicketKey = String(t.rawId ?? t.id);
                  const showUnreadBang =
                    timeSegment === "involved" && unreadTicketIds.has(rowTicketKey);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => openTicket(t.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") openTicket(t.id); }}
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
                              aria-label="Unread notification for this ticket"
                              title="Unread"
                            >
                              !
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 line-clamp-1 max-w-[24rem] text-[13.5px] font-semibold leading-snug tracking-tight text-gray-900 transition-colors duration-150 group-hover/row:text-gray-950">
                          {t.title}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 align-top text-[13px] text-gray-600">
                        {t.customer}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <ManagerStatusPill kind={priorityKind(t.priority)}>{t.priority}</ManagerStatusPill>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <ManagerStatusPill kind={statusKind()}>{t.status}</ManagerStatusPill>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <ManagerStatusPill kind={t.sla.state}>{t.sla.label}</ManagerStatusPill>
                      </td>
                      <td className="px-5 py-3.5 align-top text-[13px] font-semibold text-gray-900">
                        {t.assignee || (
                          <span className="font-medium text-slate-500">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top text-right text-[11.5px] tabular-nums text-slate-500">
                        {t.updatedAt}
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
