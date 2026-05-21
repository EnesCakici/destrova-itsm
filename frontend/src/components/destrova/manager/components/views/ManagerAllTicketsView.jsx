import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNotifications, markAllNotificationsRead, NOTIFICATIONS_BUMP_EVENT } from "../../../../../services/api";
import { useManagerTicketsData } from "../../hooks/useManagerTicketsData";
import { MANAGER_COLORS } from "../../managerTokens";
import ManagerCard from "../ManagerCard";
import ManagerStatusPill, { priorityKind } from "../ManagerStatusPill";
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
        className="rounded-lg border-0 bg-white px-3 py-2 text-sm font-medium outline-none transition-[box-shadow,background-color] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)]"
        style={{
          color: MANAGER_COLORS.dark,
          boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)",
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
    <div
      className="grid grid-cols-2 gap-4 rounded-xl px-4 py-4 sm:grid-cols-3"
      style={{
        backgroundColor: "#FFFFFF",
        backgroundImage: "linear-gradient(180deg, #FFFFFF 0%, #FAFBFE 100%)",
        boxShadow: "0 0 0 1px rgba(39,39,87,0.06) inset, 0 1px 0 rgba(255,255,255,0.7) inset",
      }}
    >
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

function SortHeader({ id, label, sort, onSort, align = "left" }) {
  const active = sort.key === id;
  return (
    <th className={`px-6 py-4 ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onSort(id)}
        className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] outline-none transition-colors duration-150 hover:text-[#0F0E47] focus-visible:text-[#0F0E47] ${
          align === "right" ? "ml-auto" : ""
        }`}
        style={{ color: active ? MANAGER_COLORS.dark : MANAGER_COLORS.muted }}
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
      <svg viewBox="0 0 12 12" className="h-3 w-3 opacity-50" fill="none" aria-hidden>
        <path d="M6 2.5l2.5 2.5h-5L6 2.5zM6 9.5l-2.5-2.5h5L6 9.5z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
      {dir === "asc" ? (
        <path d="M6 3l3.5 4h-7L6 3z" fill="currentColor" />
      ) : (
        <path d="M6 9l-3.5-4h7L6 9z" fill="currentColor" />
      )}
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
            <div
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: "rgba(39,39,87,0.06)", color: MANAGER_COLORS.dark }}
            >
              <span className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                  Team workload:
                </span>
                <span className="font-semibold">Filtered by agent · ID {assigneeFilter}</span>
              </span>
              <button
                type="button"
                onClick={() => setAssigneeFilter(null)}
                className="rounded-full px-2 py-1 text-[11px] font-semibold transition-[background-color] duration-150 hover:bg-[rgba(39,39,87,0.1)]"
              >
                Clear
              </button>
            </div>
          ) : null}

          {/* Customer filtre chip'i */}
          {customerFilter ? (
            <div
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: "rgba(39,39,87,0.06)", color: MANAGER_COLORS.dark }}
            >
              <span className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                  From global search:
                </span>
                <span className="font-semibold">Customer · {customerFilter}</span>
              </span>
              <button
                type="button"
                onClick={() => setCustomerFilter(null)}
                className="rounded-full px-2 py-1 text-[11px] font-semibold transition-[background-color] duration-150 hover:bg-[rgba(39,39,87,0.1)]"
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
                className="w-full rounded-xl border-0 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)]"
                style={{
                  color: MANAGER_COLORS.dark,
                  boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)",
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-[background-color,color] duration-150"
              style={{
                color: filtersOpen || activeFilterCount > 0 ? MANAGER_COLORS.surface : MANAGER_COLORS.dark,
                backgroundColor:
                  filtersOpen || activeFilterCount > 0 ? MANAGER_COLORS.dark : "rgba(39,39,87,0.06)",
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

      <ManagerCard padding="p-0" elevated>
        <div
          className="flex flex-wrap items-center gap-2 border-b border-[rgba(39,39,87,0.08)] px-5 py-3 md:px-6"
          role="tablist"
          aria-label="Ticket list segment"
        >
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
            View
          </span>
          <div
            className="inline-flex items-center gap-0.5 rounded-lg p-1"
            style={{
              backgroundColor: "rgba(39,39,87,0.05)",
              boxShadow: "0 0 0 1px rgba(39,39,87,0.06) inset",
            }}
          >
            {[
              { id: "active", label: "Active tickets", count: activeCount },
              { id: "involved", label: "Involved", count: involvedCount },
              { id: "past", label: "Past tickets", count: pastCount },
            ].map((seg) => {
              const on = timeSegment === seg.id;
              return (
                <button
                  key={seg.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onSegmentChange(seg.id)}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold tracking-tight transition-[background-color,color,box-shadow] duration-150"
                  style={{
                    color: on ? MANAGER_COLORS.dark : MANAGER_COLORS.support,
                    backgroundColor: on ? "#FFFFFF" : "transparent",
                    boxShadow: on
                      ? "0 1px 2px rgba(15,14,71,0.08), 0 0 0 1px rgba(39,39,87,0.08)"
                      : "none",
                  }}
                >
                  {seg.label} ({seg.count})
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
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
            <tbody>
              {/* Yüklenirken spinner satırı — mock flash'ı önler */}
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm" style={{ color: MANAGER_COLORS.muted }}>
                    Loading tickets…
                  </td>
                </tr>
              ) : tableRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm" style={{ color: MANAGER_COLORS.support }}>
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
                  className="cursor-pointer outline-none transition-colors duration-150 hover:bg-[rgba(39,39,87,0.035)] focus-visible:bg-[rgba(39,39,87,0.06)]"
                >
                  <td className="px-6 py-5 align-top">
                    <p className="flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] font-semibold tracking-tight" style={{ color: MANAGER_COLORS.muted }}>
                      <span>{labelId}</span>
                      {showUnreadBang ? (
                        <span
                          className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
                          style={{ backgroundColor: "#DC2626" }}
                          aria-label="Unread notification for this ticket"
                          title="Unread"
                        >
                          !
                        </span>
                      ) : null}
                    </p>
                    <p
                      className="mt-1 line-clamp-1 max-w-[24rem] text-sm font-semibold"
                      style={{ color: MANAGER_COLORS.dark }}
                    >
                      {t.title}
                    </p>
                  </td>
                  <td className="px-6 py-5 align-top text-sm" style={{ color: MANAGER_COLORS.support }}>
                    {t.customer}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <ManagerStatusPill kind={priorityKind(t.priority)}>{t.priority}</ManagerStatusPill>
                  </td>
                  <td className="px-6 py-5 align-top text-sm font-medium" style={{ color: MANAGER_COLORS.support }}>
                    {t.status}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <ManagerStatusPill kind={t.sla.state}>{t.sla.label}</ManagerStatusPill>
                  </td>
                  <td className="px-6 py-5 align-top text-sm" style={{ color: MANAGER_COLORS.dark }}>
                    {t.assignee || (
                      <span style={{ color: MANAGER_COLORS.muted }}>Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-5 align-top text-right text-xs tabular-nums" style={{ color: MANAGER_COLORS.muted }}>
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
