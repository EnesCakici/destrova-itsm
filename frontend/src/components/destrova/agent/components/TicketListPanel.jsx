import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import TicketRow from "./TicketRow";
import { isTicketActive, isTicketHistory, isTicketUnassigned } from "../data/workspaceModel";

/** Shared horizontal inset: inbox header + ticket list (one left edge). */
const INBOX_HEADER_PAD = "px-5";

const OWNERSHIP = [
  { id: "mine", label: "Assigned to me" },
  { id: "unassigned", label: "Unassigned" },
];

const SLA_BUCKETS = [
  { value: "All", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "d1_3", label: "Due in 1–3 days" },
  { value: "d4_7", label: "Due in 4–7 days" },
  { value: "custom", label: "Custom range" },
];

const CREATED_PRESETS = [
  { value: "All", label: "All" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

function calendarDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseIso(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysFromTodayTo(due) {
  const now = new Date();
  const today = calendarDay(now);
  const dueDay = calendarDay(due);
  return Math.round((dueDay - today) / 86400000);
}

function ticketMatchesSlaBucket(ticket, bucket, customFrom, customTo) {
  if (bucket === "All") return true;
  const due = parseIso(ticket.slaDueAt);
  if (!due) return false;
  const diff = daysFromTodayTo(due);
  if (bucket === "overdue") return diff < 0;
  if (bucket === "today") return diff === 0;
  if (bucket === "d1_3") return diff >= 1 && diff <= 3;
  if (bucket === "d4_7") return diff >= 4 && diff <= 7;
  if (bucket === "custom") {
    if (!customFrom && !customTo) return true;
    const dueDay = calendarDay(due).getTime();
    if (customFrom) {
      const from = calendarDay(new Date(`${customFrom}T00:00:00`)).getTime();
      if (dueDay < from) return false;
    }
    if (customTo) {
      const to = calendarDay(new Date(`${customTo}T00:00:00`)).getTime();
      if (dueDay > to) return false;
    }
    return true;
  }
  return true;
}

function ticketMatchesCreated(ticket, preset, customFrom, customTo) {
  if (preset === "All") return true;
  const created = parseIso(ticket.createdAt);
  if (!created) return true;
  const now = new Date();
  if (preset === "7d") {
    const t = new Date(now);
    t.setDate(t.getDate() - 7);
    return created >= t;
  }
  if (preset === "30d") {
    const t = new Date(now);
    t.setDate(t.getDate() - 30);
    return created >= t;
  }
  if (preset === "custom") {
    if (!customFrom && !customTo) return true;
    const cDay = calendarDay(created).getTime();
    if (customFrom) {
      const from = calendarDay(new Date(`${customFrom}T00:00:00`)).getTime();
      if (cDay < from) return false;
    }
    if (customTo) {
      const to = calendarDay(new Date(`${customTo}T00:00:00`)).getTime();
      if (cDay > to) return false;
    }
    return true;
  }
  return true;
}

function IconUser({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUsers({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-4a4 4 0 1 1 0 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSliders({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M9 8h6M15 16h6M5 12h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PopoverField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      {children}
    </div>
  );
}

function selectClass() {
  return [
    "h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-sm text-slate-800",
    "shadow-sm outline-none transition hover:border-slate-300",
    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15",
  ].join(" ");
}

export default function TicketListPanel({ tickets, selectedId, savedView, onViewChange, onSelect }) {
  const [activityTab, setActivityTab] = useState("active");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [slaBucket, setSlaBucket] = useState("All");
  const [slaCustomFrom, setSlaCustomFrom] = useState("");
  const [slaCustomTo, setSlaCustomTo] = useState("");
  const [createdPreset, setCreatedPreset] = useState("All");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 288 });

  const popoverRef = useRef(null);
  const filtersBtnRef = useRef(null);

  useEffect(() => {
    if (activityTab === "active" && savedView === "all") {
      onViewChange("mine");
    }
  }, [activityTab, savedView, onViewChange]);

  useEffect(() => {
    setFiltersOpen(false);
  }, [activityTab]);

  /** Tab counts match list scope (ownership for active; all history for closed). */
  const activeCount = useMemo(() => {
    let rows = tickets.filter(isTicketActive);
    if (savedView === "mine") rows = rows.filter((t) => t.assignee === "You");
    if (savedView === "unassigned") rows = rows.filter(isTicketUnassigned);
    return rows.length;
  }, [tickets, savedView]);

  const closedCount = useMemo(() => tickets.filter(isTicketHistory).length, [tickets]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter !== "All") n += 1;
    if (priorityFilter !== "All") n += 1;
    if (slaBucket !== "All") n += 1;
    if (createdPreset !== "All") n += 1;
    return n;
  }, [statusFilter, priorityFilter, slaBucket, createdPreset]);

  const involvedCount = useMemo(() => tickets.filter((t) => t.mentionInvolved).length, [tickets]);

  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  const updatePopoverPosition = useCallback(() => {
    const el = filtersBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const maxW = 288;
    const w = Math.min(maxW, window.innerWidth - 2 * margin);
    let left = r.left;
    if (left + w > window.innerWidth - margin) left = window.innerWidth - margin - w;
    if (left < margin) left = margin;
    setPopoverPos({ top: r.bottom + 6, left, width: w });
  }, []);

  useLayoutEffect(() => {
    if (!filtersOpen) return;
    updatePopoverPosition();
  }, [filtersOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onScrollOrResize = () => updatePopoverPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [filtersOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeFilters();
    };
    const onPointer = (e) => {
      const root = popoverRef.current;
      const btn = filtersBtnRef.current;
      if (!root || root.contains(e.target) || (btn && btn.contains(e.target))) return;
      closeFilters();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [filtersOpen, closeFilters]);

  const filteredTickets = useMemo(() => {
    let rows = [...tickets];
    if (activityTab === "involved") {
      rows = rows.filter((t) => t.mentionInvolved);
    } else if (activityTab === "active") {
      rows = rows.filter(isTicketActive);
      if (savedView === "mine") rows = rows.filter((t) => t.assignee === "You");
      if (savedView === "unassigned") rows = rows.filter(isTicketUnassigned);
    } else {
      rows = rows.filter(isTicketHistory);
    }
    if (statusFilter !== "All") rows = rows.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "All") rows = rows.filter((t) => t.priority === priorityFilter);
    rows = rows.filter((t) => ticketMatchesSlaBucket(t, slaBucket, slaCustomFrom, slaCustomTo));
    rows = rows.filter((t) => ticketMatchesCreated(t, createdPreset, createdFrom, createdTo));
    return rows.sort((a, b) => (b.updatedRank || 0) - (a.updatedRank || 0));
  }, [
    tickets,
    activityTab,
    savedView,
    statusFilter,
    priorityFilter,
    slaBucket,
    slaCustomFrom,
    slaCustomTo,
    createdPreset,
    createdFrom,
    createdTo,
  ]);

  const resetSecondaryFilters = () => {
    setStatusFilter("All");
    setPriorityFilter("All");
    setSlaBucket("All");
    setSlaCustomFrom("");
    setSlaCustomTo("");
    setCreatedPreset("All");
    setCreatedFrom("");
    setCreatedTo("");
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col bg-slate-50">
      {/* Inbox header: single horizontal inset (INBOX_HEADER_PAD) so tabs, toggles, filters, and list share one left edge. */}
      <div
        className={[
          "sticky top-0 z-10 w-full shrink-0 border-b border-slate-200 bg-white",
          INBOX_HEADER_PAD,
          "pb-2.5 pt-3",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-col gap-3">
          {/* Active / Closed — underline tabs (not pill buttons) */}
          <div
            className="flex min-w-0 items-end gap-6 border-b border-slate-200"
            role="tablist"
            aria-label="Ticket activity"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activityTab === "active"}
              onClick={() => setActivityTab("active")}
              className={[
                "relative shrink-0 whitespace-nowrap border-0 bg-transparent pb-2 text-sm outline-none transition-colors duration-150 ease-out",
                "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-0",
                activityTab === "active"
                  ? "font-semibold text-slate-900 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-slate-900"
                  : "font-medium text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              Active tickets ({activeCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activityTab === "involved"}
              onClick={() => setActivityTab("involved")}
              className={[
                "relative shrink-0 whitespace-nowrap border-0 bg-transparent pb-2 text-sm outline-none transition-colors duration-150 ease-out",
                "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-0",
                activityTab === "involved"
                  ? "font-semibold text-slate-900 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-slate-900"
                  : "font-medium text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              Involved ({involvedCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activityTab === "closed"}
              onClick={() => setActivityTab("closed")}
              className={[
                "relative shrink-0 whitespace-nowrap border-0 bg-transparent pb-2 text-sm outline-none transition-colors duration-150 ease-out",
                "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-0",
                activityTab === "closed"
                  ? "font-semibold text-slate-900 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-slate-900"
                  : "font-medium text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              Closed tickets ({closedCount})
            </button>
          </div>

          {/* Assigned / Unassigned + Filters — one row, same inset; gap-3 between groups */}
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {activityTab === "active" ? (
              <div
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100/90 p-0.5"
                role="group"
                aria-label="Queue scope"
              >
                {OWNERSHIP.map((o) => {
                  const on = o.id === savedView;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onViewChange(o.id)}
                      className={[
                        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-0 px-3 text-xs font-medium outline-none transition-colors duration-150 ease-out",
                        "focus-visible:ring-2 focus-visible:ring-slate-400/35 focus-visible:ring-offset-0",
                        on ? "bg-white text-slate-900" : "bg-transparent text-slate-500 hover:text-slate-800",
                      ].join(" ")}
                    >
                      <span className={on ? "text-slate-700" : "text-slate-400"} aria-hidden>
                        {o.id === "mine" ? <IconUser className="h-3.5 w-3.5" /> : <IconUsers className="h-3.5 w-3.5" />}
                      </span>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <button
              ref={filtersBtnRef}
              type="button"
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
              aria-controls="ticket-list-filters-popover"
              onClick={() => setFiltersOpen((v) => !v)}
              className={[
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 outline-none transition-colors duration-150 ease-out",
                "hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400/35 focus-visible:ring-offset-0",
                filtersOpen || activeFilterCount > 0 ? "border-slate-300 text-slate-900" : "",
              ].join(" ")}
            >
              <IconSliders className="h-3.5 w-3.5 text-slate-500" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-800 px-1 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {filtersOpen ? (
        <div
          ref={popoverRef}
          id="ticket-list-filters-popover"
          role="dialog"
          aria-label="Filters"
          className="fixed z-50 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm"
          style={{ top: popoverPos.top, left: popoverPos.left, width: popoverPos.width }}
        >
          <div className="max-h-[min(70vh,24rem)] space-y-3 overflow-y-auto pr-0.5">
            <PopoverField label="Status">
              <select
                className={selectClass()}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Status"
              >
                <option value="All">All statuses</option>
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting for Customer">Waiting for Customer</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </PopoverField>

            <PopoverField label="Priority">
              <select
                className={selectClass()}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                aria-label="Priority"
              >
                <option value="All">All priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </PopoverField>

            <PopoverField label="SLA due date">
              <select
                className={selectClass()}
                value={slaBucket}
                onChange={(e) => setSlaBucket(e.target.value)}
                aria-label="SLA due date"
              >
                {SLA_BUCKETS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {slaBucket === "custom" ? (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="date"
                    className={selectClass()}
                    value={slaCustomFrom}
                    onChange={(e) => setSlaCustomFrom(e.target.value)}
                    aria-label="SLA due from"
                  />
                  <input
                    type="date"
                    className={selectClass()}
                    value={slaCustomTo}
                    onChange={(e) => setSlaCustomTo(e.target.value)}
                    aria-label="SLA due to"
                  />
                </div>
              ) : null}
            </PopoverField>

            <PopoverField label="Created date">
              <select
                className={selectClass()}
                value={createdPreset}
                onChange={(e) => setCreatedPreset(e.target.value)}
                aria-label="Created date"
              >
                {CREATED_PRESETS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {createdPreset === "custom" ? (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="date"
                    className={selectClass()}
                    value={createdFrom}
                    onChange={(e) => setCreatedFrom(e.target.value)}
                    aria-label="Created from"
                  />
                  <input
                    type="date"
                    className={selectClass()}
                    value={createdTo}
                    onChange={(e) => setCreatedTo(e.target.value)}
                    aria-label="Created to"
                  />
                </div>
              ) : null}
            </PopoverField>

            <div className="flex gap-2 border-t border-[#E2E8F0] pt-3">
              <button
                type="button"
                onClick={resetSecondaryFilters}
                className="h-9 flex-1 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={closeFilters}
                className="h-9 flex-1 rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={[
          "flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pb-2 pt-2",
          INBOX_HEADER_PAD,
        ].join(" ")}
      >
        {filteredTickets.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
            No tickets match these filters.
          </p>
        ) : (
          filteredTickets.map((t) => <TicketRow key={t.id} ticket={t} selected={t.id === selectedId} onSelect={onSelect} />)
        )}
      </div>
    </div>
  );
}
