import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNotifications, markAllNotificationsRead, NOTIFICATIONS_BUMP_EVENT } from "../../../../../services/api";
import { useManagerTicketsData } from "../../hooks/useManagerTicketsData";
import { MANAGER_CHROME, MANAGER_COLORS } from "../../managerTokens";
import ManagerCard from "../ManagerCard";
import ManagerStatusPill, { priorityKind, statusKind } from "../ManagerStatusPill";
import ManagerSurface from "../ManagerSurface";
import { useManagerWorkspace } from "../ManagerWorkspaceContext";

function IconSearch({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.65" />
      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function IconFilter({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 5h16M7 12h10M10 19h4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function FilterChip({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
      <span className="font-semibold uppercase tracking-[0.14em]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none transition-[box-shadow,background-color] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
        style={{
          color: MANAGER_COLORS.dark,
          boxShadow: MANAGER_CHROME.inputInset,
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

function FilterPanel({ open, filters, setFilters, filterOptions }) {
  if (!open) return null;
  return (
    <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:grid-cols-3">
      <FilterChip
        label="Status"
        value={filters.status}
        options={filterOptions.status}
        onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
      />
      <FilterChip
        label="Priority"
        value={filters.priority}
        options={filterOptions.priority}
        onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
      />
      <FilterChip
        label="SLA"
        value={filters.sla}
        options={filterOptions.sla}
        onChange={(v) => setFilters((f) => ({ ...f, sla: v }))}
      />
    </div>
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

const SORT_ACCESSORS = {
  ticket:   (t) => t.id.toLowerCase(),
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

const MANAGER_TABLE_HEADER_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500";

/** Column headers — same style as Admin Users & Roles (AdminTable). */
function SortHeader({ id, label, sort, onSort, align = "left" }) {
  const active = sort.key === id;
  return (
    <th
      scope="col"
      className={`px-4 py-3.5 text-left font-normal ${align === "right" ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(id)}
        className={`inline-flex items-center gap-1 border-0 bg-transparent p-0 outline-none transition-colors duration-150 hover:text-slate-800 focus-visible:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600/20 ${MANAGER_TABLE_HEADER_LABEL} ${
          active ? "!text-blue-700" : ""
        } ${align === "right" ? "ml-auto" : ""}`}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{label}</span>
        <SortArrow active={active} dir={sort.dir} />
      </button>
    </th>
  );
}

function SortArrow({ active, dir }) {
  if (!active) {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3 text-slate-400/70" fill="none" aria-hidden>
        <path d="M6 2.5l2.2 2.2H3.8L6 2.5zM6 9.5L3.8 7.3h4.4L6 9.5z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 text-blue-600" fill="none" aria-hidden>
      {dir === "desc"
        ? <path d="M6 9.5L3.8 7.3h4.4L6 9.5z" fill="currentColor" />
        : <path d="M6 2.5l2.2 2.2H3.8L6 2.5z" fill="currentColor" />
      }
    </svg>
  );
}

export default function ManagerAllTicketsView() {
  const { openTicket, customerFilter, setCustomerFilter, assigneeFilter, setAssigneeFilter } = useManagerWorkspace();
  const { tickets, filterOptions, loading } = useManagerTicketsData();
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(() => ({
    status: filterOptions.status?.[0] || "All statuses",
    priority: filterOptions.priority?.[0] || "All priorities",
    sla: filterOptions.sla?.[0] || "All SLA",
  }));
  const [sort, setSort] = useState({ key: "updated", dir: "desc" });
  const [timeSegment, setTimeSegment] = useState("active");
  const [unreadTicketIds, setUnreadTicketIds] = useState(() => new Set());
  const inputRef = useRef(null);

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

  // assigneeFilter veya customerFilter değişince arama kutusunu temizle
  useEffect(() => {
    if (assigneeFilter != null) setQuery("");
  }, [assigneeFilter]);

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
      return true;
    });

    const accessor = SORT_ACCESSORS[sort.key];
    if (accessor) {
      const factor = sort.dir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => factor * compare(accessor(a), accessor(b)));
    }
    return rows;
  }, [query, filters, sort, customerFilter, assigneeFilter, tickets]);

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

  const activeFilterCount = [
    filters.status.startsWith("All") ? 0 : 1,
    filters.priority.startsWith("All") ? 0 : 1,
    filters.sla.startsWith("All") ? 0 : 1,
  ].reduce((a, b) => a + b, 0);

  const tableRows = useMemo(() => {
    if (timeSegment === "active") {
      return filteredAndSorted.filter((t) => t.status !== "Closed");
    }
    if (timeSegment === "involved") {
      return filteredAndSorted.filter((t) => Boolean(t.mentionInvolved) && t.status !== "Closed");
    }
    return filteredAndSorted.filter((t) => t.status === "Closed");
  }, [filteredAndSorted, timeSegment]);

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
      <ManagerCard padding="p-5 md:p-6" tone="muted">
        <div className="flex flex-col gap-4">
          {/* Agent filtre chip'i */}
          {assigneeFilter != null ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-900">
              <span className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                  Team workload:
                </span>
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

          {/* Customer filtre chip'i */}
          {customerFilter ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-900">
              <span className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                  From global search:
                </span>
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

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <IconSearch
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: MANAGER_COLORS.muted }}
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter this table — id, title, customer, product, assignee"
                aria-label="Filter All Tickets table"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
                style={{
                  color: MANAGER_COLORS.dark,
                  boxShadow: MANAGER_CHROME.inputInset,
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-[background-color,color] duration-150"
              style={{
                color: filtersOpen || activeFilterCount > 0 ? "#FFFFFF" : MANAGER_COLORS.dark,
                backgroundColor:
                  filtersOpen || activeFilterCount > 0 ? MANAGER_COLORS.primary : MANAGER_CHROME.pillTray,
              }}
              aria-expanded={filtersOpen}
            >
              <IconFilter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span
                  className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
                  style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                >
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: MANAGER_COLORS.muted }}>
            Filters this table only. Use the topbar search (Ctrl+K) for global search across tickets, customers, and agents.
          </p>
          <FilterPanel
            open={filtersOpen}
            filters={filters}
            setFilters={setFilters}
            filterOptions={filterOptions}
          />
        </div>
      </ManagerCard>

      <ManagerCard padding="p-0" elevated className="overflow-hidden border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center border-b border-gray-200 bg-white px-5 py-3 md:px-6">
          <div className="destrova-radio-inputs" role="tablist" aria-label="Ticket list segment">
            {[
              { id: "active", label: "Active tickets", count: activeCount },
              { id: "involved", label: "Involved", count: involvedCount },
              { id: "past", label: "Past tickets", count: pastCount },
            ].map((seg) => {
              const inputId = `manager-all-tickets-segment-${seg.id}`;
              return (
                <div key={seg.id} className="radio" role="presentation">
                  <input
                    type="radio"
                    name="manager-all-tickets-segment"
                    id={inputId}
                    checked={timeSegment === seg.id}
                    onChange={() => onSegmentChange(seg.id)}
                    role="tab"
                    aria-selected={timeSegment === seg.id}
                  />
                  <label htmlFor={inputId} className="name">
                    <span>{seg.label}</span>
                    <span className="count">({seg.count})</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-slate-50/90">
              <tr className="border-b border-gray-200">
                <SortHeader id="ticket"   label="Ticket"   sort={sort} onSort={sortBy} />
                <SortHeader id="customer" label="Customer" sort={sort} onSort={sortBy} />
                <SortHeader id="priority" label="Priority" sort={sort} onSort={sortBy} />
                <SortHeader id="status"   label="Status"   sort={sort} onSort={sortBy} />
                <SortHeader id="sla"      label="SLA"      sort={sort} onSort={sortBy} />
                <SortHeader id="assignee" label="Assignee" sort={sort} onSort={sortBy} />
                <SortHeader id="updated"  label="Updated"  sort={sort} onSort={sortBy} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {/* Yüklenirken spinner satırı — mock flash'ı önler */}
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    Loading tickets…
                  </td>
                </tr>
              ) : tableRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    No tickets match this view.
                  </td>
                </tr>
              ) : null}
              {!loading && tableRows.map((t) => {
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
                  className="cursor-pointer outline-none transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600/15"
                >
                  <td className="px-6 py-5 align-top">
                    <p className="flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] font-semibold tracking-tight text-gray-600">
                      <span>{labelId}</span>
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
                    <p className="mt-1 line-clamp-1 max-w-[24rem] text-sm font-semibold text-gray-900">
                      {t.title}
                    </p>
                  </td>
                  <td className="px-6 py-5 align-top text-sm text-gray-600">
                    {t.customer}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <ManagerStatusPill kind={priorityKind(t.priority)}>{t.priority}</ManagerStatusPill>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <ManagerStatusPill kind={statusKind()}>{t.status}</ManagerStatusPill>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <ManagerStatusPill kind={t.sla.state}>{t.sla.label}</ManagerStatusPill>
                  </td>
                  <td className="px-6 py-5 align-top text-sm text-gray-900">
                    {t.assignee || (
                      <span className="text-slate-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-5 align-top text-right text-xs tabular-nums text-slate-500">
                    {t.updatedAt}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ManagerCard>
    </ManagerSurface>
  );
}
