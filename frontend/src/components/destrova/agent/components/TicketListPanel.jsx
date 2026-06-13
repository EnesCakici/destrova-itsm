import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import TicketRow from "./TicketRow";
import { parseApiDateTime } from "../../../../utils/apiDateTime.js";
import { WorkspacePanelToggleButton } from "./workspacePanelToggle.jsx";
import { isTicketActive, isTicketHistory, isTicketUnassigned } from "../data/workspaceModel";
import {
  getTicketListSortFieldsI18n,
  isDefaultTicketListSort,
  persistTicketListSortPreference,
  readTicketListSortPreference,
  sortTicketListRows,
  ticketListSortAriaLabelI18n,
  toggleTicketListSortField,
} from "../data/ticketListSort.js";

/** Shared horizontal inset: inbox header + ticket list (one left edge). */
const INBOX_HEADER_PAD = "px-4";

const OWNERSHIP_IDS = ["mine", "unassigned"];

const SLA_BUCKET_VALUES = ["All", "overdue", "today", "d1_3", "d4_7", "custom"];

const CREATED_PRESET_VALUES = ["All", "7d", "30d", "custom"];

const STATUS_FILTER_CODES = ["NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"];
const PRIORITY_FILTER_CODES = ["HIGH", "MEDIUM", "LOW"];

function calendarDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseIso(s) {
  if (!s) return null;
  return parseApiDateTime(s);
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

/** Compact ↕ — standard enterprise sort affordance. */
function IconSort({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2.75v10.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M5.75 5.25L8 3l2.25 2.25" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.75 10.75L8 13l2.25-2.25" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function computeAnchoredPopoverPosition(btnEl, { width = 288, align = "left" } = {}) {
  if (!btnEl) return { top: 0, left: 0, width };
  const margin = 8;
  const w = Math.min(width, window.innerWidth - 2 * margin);
  const r = btnEl.getBoundingClientRect();
  let left = align === "right" ? r.right - w : r.left;
  if (left + w > window.innerWidth - margin) left = window.innerWidth - margin - w;
  if (left < margin) left = margin;
  return { top: r.bottom + 6, left, width: w };
}

const TOOLBAR_BUTTON_BASE =
  "flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white text-[13px] font-medium text-slate-600 outline-none transition-colors duration-150 hover:bg-slate-50 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:ring-offset-0";

const FILTERS_TOOLBAR_BUTTON = `${TOOLBAR_BUTTON_BASE} h-8 min-w-0 flex-1`;
const SORT_ICON_BUTTON = `${TOOLBAR_BUTTON_BASE} h-8 w-8 shrink-0`;

const FILTERS_POPOVER_SHELL =
  "fixed z-50 rounded-agent-card border border-destrova-agent-border bg-white p-3 shadow-agent-card";

const SORT_POPOVER_SHELL =
  "fixed z-50 rounded-agent-card border border-destrova-agent-border bg-white p-2 shadow-agent-card";

function SortDirectionBadge({ children }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-1.5 py-px text-[10px] font-semibold leading-none text-blue-600 ring-1 ring-blue-100">
      {children}
    </span>
  );
}

function TabCountBadge({ count, active }) {
  return (
    <span
      className={[
        "ml-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums",
        active ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100" : "bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      {count}
    </span>
  );
}

function ActivityTabButton({ label, count, selected, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={[
        "-mb-px inline-flex shrink-0 items-center justify-start border-0 bg-transparent px-0 pb-2.5 pt-1 text-sm leading-none outline-none transition-colors duration-150",
        "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-0",
        selected
          ? "border-b-2 border-blue-600 font-semibold text-blue-600"
          : "border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-700",
      ].join(" ")}
    >
      <span className="inline-flex items-center">
        {label}
        {count > 0 ? <TabCountBadge count={count} active={selected} /> : null}
      </span>
    </button>
  );
}

const ACTIVITY_TAB_IDS = ["active", "involved", "closed"];

function PopoverField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      {children}
    </div>
  );
}

function selectClass() {
  return [
    "h-9 w-full rounded-agent-button border border-destrova-agent-border bg-white px-2.5 text-sm text-slate-800",
    "shadow-sm outline-none transition hover:border-slate-300",
    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15",
  ].join(" ");
}

export default function TicketListPanel({
  tickets,
  selectedId,
  savedView,
  onViewChange,
  onSelect,
  currentUserId = null,
  onRequestCollapse,
}) {
  const { t } = useTranslation("agent");
  const { t: tc } = useTranslation("common");

  const ownershipOptions = useMemo(
    () =>
      OWNERSHIP_IDS.map((id) => ({
        id,
        label: t(`inbox.ownership.${id}`),
      })),
    [t],
  );

  const slaBuckets = useMemo(
    () =>
      SLA_BUCKET_VALUES.map((value) => ({
        value,
        label: value === "All" ? t("inbox.slaBucket.all") : t(`inbox.slaBucket.${value}`),
      })),
    [t],
  );

  const createdPresets = useMemo(
    () =>
      CREATED_PRESET_VALUES.map((value) => ({
        value,
        label: value === "All" ? t("inbox.createdPreset.all") : t(`inbox.createdPreset.${value}`),
      })),
    [t],
  );

  const activityTabs = useMemo(
    () =>
      ACTIVITY_TAB_IDS.map((id) => ({
        id,
        label: t(`inbox.tabs.${id}`),
      })),
    [t],
  );

  const sortFields = useMemo(() => getTicketListSortFieldsI18n(t), [t]);

  const [activityTab, setActivityTab] = useState("active");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortState, setSortState] = useState(readTicketListSortPreference);
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
  const sortPopoverRef = useRef(null);
  const filtersBtnRef = useRef(null);
  const sortBtnRef = useRef(null);

  useEffect(() => {
    if (activityTab === "active" && savedView === "all") {
      onViewChange("mine");
    }
  }, [activityTab, savedView, onViewChange]);

  useEffect(() => {
    setFiltersOpen(false);
    setSortOpen(false);
  }, [activityTab]);

  const sortIsCustom = !isDefaultTicketListSort(sortState);
  const sortHint = ticketListSortAriaLabelI18n(sortState, t);

  /** Tab counts match list scope (ownership for active; all history for closed). */
  const activeCount = useMemo(() => {
    let rows = tickets.filter(isTicketActive);
    if (savedView === "mine") rows = rows.filter((t) => t.assignedToMe || t.pendingTransferToMe);
    if (savedView === "unassigned") rows = rows.filter(isTicketUnassigned);
    return rows.length;
  }, [tickets, savedView]);

  const closedCount = useMemo(
    () => tickets.filter((t) => isTicketHistory(t, currentUserId)).length,
    [tickets, currentUserId],
  );

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
  const closeSort = useCallback(() => setSortOpen(false), []);

  const updatePopoverPosition = useCallback((btnRef, opts) => {
    setPopoverPos(computeAnchoredPopoverPosition(btnRef.current, opts));
  }, []);

  useLayoutEffect(() => {
    if (filtersOpen) updatePopoverPosition(filtersBtnRef, { width: 288, align: "left" });
    else if (sortOpen) updatePopoverPosition(sortBtnRef, { width: 196, align: "right" });
  }, [filtersOpen, sortOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!filtersOpen && !sortOpen) return undefined;
    const onScrollOrResize = () => {
      if (filtersOpen) updatePopoverPosition(filtersBtnRef, { width: 288, align: "left" });
      if (sortOpen) updatePopoverPosition(sortBtnRef, { width: 196, align: "right" });
    };
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [filtersOpen, sortOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!filtersOpen && !sortOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeFilters();
        closeSort();
      }
    };
    const onPointer = (e) => {
      const target = e.target;
      const inFilters =
        popoverRef.current?.contains(target) || filtersBtnRef.current?.contains(target);
      const inSort =
        sortPopoverRef.current?.contains(target) || sortBtnRef.current?.contains(target);
      if (filtersOpen && !inFilters) closeFilters();
      if (sortOpen && !inSort) closeSort();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [filtersOpen, sortOpen, closeFilters, closeSort]);

  const selectSortField = useCallback((fieldId) => {
    setSortState((prev) => {
      const next = toggleTicketListSortField(prev, fieldId);
      persistTicketListSortPreference(next);
      return next;
    });
  }, []);

  const filteredTickets = useMemo(() => {
    let rows = [...tickets];
    if (activityTab === "involved") {
      rows = rows.filter((t) => t.mentionInvolved);
    } else if (activityTab === "active") {
      rows = rows.filter(isTicketActive);
      if (savedView === "mine") rows = rows.filter((t) => t.assignedToMe || t.pendingTransferToMe);
      if (savedView === "unassigned") rows = rows.filter(isTicketUnassigned);
    } else {
      rows = rows.filter((t) => isTicketHistory(t, currentUserId));
    }
    if (statusFilter !== "All") rows = rows.filter((t) => (t.statusCode || t.status) === statusFilter);
    if (priorityFilter !== "All") rows = rows.filter((t) => (t.priorityCode || t.priority) === priorityFilter);
    rows = rows.filter((t) => ticketMatchesSlaBucket(t, slaBucket, slaCustomFrom, slaCustomTo));
    rows = rows.filter((t) => ticketMatchesCreated(t, createdPreset, createdFrom, createdTo));
    return sortTicketListRows(rows, sortState);
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
    currentUserId,
    sortState,
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

  const activityCounts = {
    active: activeCount,
    involved: involvedCount,
    closed: closedCount,
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col bg-white">
      <div
        className={[
          "sticky top-0 z-10 w-full shrink-0 bg-white",
          INBOX_HEADER_PAD,
          "pb-2.5 pt-2.5",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold leading-none tracking-tight text-slate-800">{t("inbox.title")}</h2>
            {onRequestCollapse ? (
              <WorkspacePanelToggleButton
                side="left"
                open
                onToggle={onRequestCollapse}
                compact
              />
            ) : null}
          </div>

          <div
            className="w-full border-b border-slate-200"
            role="tablist"
            aria-label={t("inbox.activity")}
          >
            <div className="flex w-full items-end justify-start gap-6">
              {activityTabs.map((tabItem) => (
                <ActivityTabButton
                  key={tabItem.id}
                  label={tabItem.label}
                  count={activityCounts[tabItem.id]}
                  selected={activityTab === tabItem.id}
                  onClick={() => setActivityTab(tabItem.id)}
                />
              ))}
            </div>
          </div>

          {activityTab === "active" ? (
            <div
              className="mt-3 grid w-full grid-cols-2 gap-1 overflow-visible rounded-md border border-slate-200/90 bg-slate-50 p-0.5"
              role="group"
              aria-label={t("inbox.queueScope")}
            >
              {ownershipOptions.map((o, index) => {
                const on = o.id === savedView;
                const isFirst = index === 0;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onViewChange(o.id)}
                    aria-pressed={on}
                    className={[
                      "relative flex min-w-0 items-center justify-center gap-1 rounded-[5px] px-1.5 py-2 text-[11px] font-medium leading-tight outline-none transition-all duration-150 sm:text-xs",
                      "focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-blue-500/25 focus-visible:ring-offset-0",
                      on
                        ? "z-10 border border-slate-200/90 bg-white text-blue-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                        : "border border-transparent bg-transparent text-slate-500 hover:bg-white/60 hover:text-slate-700",
                      isFirst && on
                        ? "after:pointer-events-none after:absolute after:-right-[6px] after:top-1/2 after:z-20 after:h-0 after:w-0 after:-translate-y-1/2 after:border-y-[10px] after:border-l-[6px] after:border-y-transparent after:border-l-white"
                        : "",
                    ].join(" ")}
                  >
                    <span className={on ? "text-blue-600" : "text-slate-400"} aria-hidden>
                      {o.id === "mine" ? <IconUser className="h-3.5 w-3.5 shrink-0" /> : <IconUsers className="h-3.5 w-3.5 shrink-0" />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="flex items-center gap-1.5">
            <button
              ref={filtersBtnRef}
              type="button"
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
              aria-controls="ticket-list-filters-popover"
              onClick={() => {
                setSortOpen(false);
                setFiltersOpen((v) => !v);
              }}
              className={[
                FILTERS_TOOLBAR_BUTTON,
                filtersOpen || activeFilterCount > 0 ? "text-slate-800" : "",
              ].join(" ")}
            >
              <IconSliders className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>{t("inbox.filters")}</span>
              {activeFilterCount > 0 ? (
                <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold leading-none text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            <button
              ref={sortBtnRef}
              type="button"
              aria-expanded={sortOpen}
              aria-haspopup="dialog"
              aria-controls="ticket-list-sort-popover"
              aria-label={sortHint}
              title={sortHint}
              onClick={() => {
                setFiltersOpen(false);
                setSortOpen((v) => !v);
              }}
              className={[
                SORT_ICON_BUTTON,
                sortOpen || sortIsCustom ? "text-slate-800" : "",
                sortIsCustom && !sortOpen ? "ring-1 ring-blue-100" : "",
              ].join(" ")}
            >
              <IconSort
                className={[
                  "h-3.5 w-3.5 shrink-0",
                  sortOpen || sortIsCustom ? "text-blue-600" : "text-slate-500",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
      </div>

      {sortOpen ? (
        <div
          ref={sortPopoverRef}
          id="ticket-list-sort-popover"
          role="menu"
          aria-label={t("inbox.sortTickets")}
          className={SORT_POPOVER_SHELL}
          style={{ top: popoverPos.top, left: popoverPos.left, width: popoverPos.width }}
        >
          <PopoverField label={t("inbox.sortBy")}>
            <ul className="space-y-px">
              {sortFields.map((field) => {
                const selected = sortState.field === field.id;
                const dirLabel = field.dirLabels[sortState.dir] || sortState.dir;
                return (
                  <li key={field.id}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => selectSortField(field.id)}
                      className={[
                        "flex w-full appearance-none items-center justify-between gap-2 rounded-[5px] border-0 px-1.5 py-1 text-left text-[12px] leading-tight shadow-none outline-none transition-all duration-150",
                        "focus-visible:ring-2 focus-visible:ring-blue-500/25 focus-visible:ring-offset-0",
                        selected
                          ? "bg-blue-50/50 font-semibold text-blue-600"
                          : "bg-transparent font-medium text-slate-500 hover:bg-slate-50/70 hover:text-slate-700",
                      ].join(" ")}
                    >
                      <span className="truncate">{field.label}</span>
                      {selected ? <SortDirectionBadge>{dirLabel}</SortDirectionBadge> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="text-[10px] leading-snug text-gray-500">{t("inbox.sortReverseHint")}</p>
          </PopoverField>
        </div>
      ) : null}

      {filtersOpen ? (
        <div
          ref={popoverRef}
          id="ticket-list-filters-popover"
          role="dialog"
          aria-label={t("inbox.filters")}
          className={FILTERS_POPOVER_SHELL}
          style={{ top: popoverPos.top, left: popoverPos.left, width: popoverPos.width }}
        >
          <div className="max-h-[min(70vh,24rem)] space-y-3 overflow-y-auto pr-0.5">
            <PopoverField label={t("inbox.filterLabels.status")}>
              <select
                className={selectClass()}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label={t("inbox.filterLabels.status")}
              >
                <option value="All">{t("inbox.allStatuses")}</option>
                {STATUS_FILTER_CODES.map((code) => (
                  <option key={code} value={code}>
                    {tc(`status.${code === "IN_PROGRESS" ? "inProgress" : code === "WAITING_FOR_CUSTOMER" ? "waitingForCustomer" : code.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </PopoverField>

            <PopoverField label={t("inbox.filterLabels.priority")}>
              <select
                className={selectClass()}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                aria-label={t("inbox.filterLabels.priority")}
              >
                <option value="All">{t("inbox.allPriorities")}</option>
                {PRIORITY_FILTER_CODES.map((code) => (
                  <option key={code} value={code}>
                    {tc(`priority.${code.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </PopoverField>

            <PopoverField label={t("inbox.filterLabels.slaDue")}>
              <select
                className={selectClass()}
                value={slaBucket}
                onChange={(e) => setSlaBucket(e.target.value)}
                aria-label={t("inbox.filterLabels.slaDue")}
              >
                {slaBuckets.map((o) => (
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
                    aria-label={t("inbox.filterLabels.slaFrom")}
                  />
                  <input
                    type="date"
                    className={selectClass()}
                    value={slaCustomTo}
                    onChange={(e) => setSlaCustomTo(e.target.value)}
                    aria-label={t("inbox.filterLabels.slaTo")}
                  />
                </div>
              ) : null}
            </PopoverField>

            <PopoverField label={t("inbox.filterLabels.created")}>
              <select
                className={selectClass()}
                value={createdPreset}
                onChange={(e) => setCreatedPreset(e.target.value)}
                aria-label={t("inbox.filterLabels.created")}
              >
                {createdPresets.map((o) => (
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
                    aria-label={t("inbox.filterLabels.createdFrom")}
                  />
                  <input
                    type="date"
                    className={selectClass()}
                    value={createdTo}
                    onChange={(e) => setCreatedTo(e.target.value)}
                    aria-label={t("inbox.filterLabels.createdTo")}
                  />
                </div>
              ) : null}
            </PopoverField>

            <div className="flex gap-2 border-t border-destrova-agent-border pt-3">
              <button
                type="button"
                onClick={resetSecondaryFilters}
                className="h-9 flex-1 rounded-agent-button border border-destrova-agent-border text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {t("inbox.clearFilters")}
              </button>
              <button
                type="button"
                onClick={closeFilters}
                className="h-9 flex-1 rounded-agent-button bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                {tc("button.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={[
          "flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden border-t border-slate-100 bg-slate-50/50 pb-2 pt-2",
          INBOX_HEADER_PAD,
        ].join(" ")}
      >
        {filteredTickets.length === 0 ? (
          <p className="rounded-agent-card border border-destrova-agent-border bg-white py-8 text-center text-sm text-slate-500 shadow-agent-card">
            {t("inbox.noTickets")}
          </p>
        ) : (
          filteredTickets.map((ticketRow) => (
            <TicketRow key={ticketRow.id} ticket={ticketRow} selected={ticketRow.id === selectedId} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}
