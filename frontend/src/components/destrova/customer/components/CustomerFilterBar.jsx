import CustomerDateFilterPopover from "./CustomerDateFilterPopover";
import { CUSTOMER_STATUS_LABELS } from "../utils/customerStatusDisplay";

/*
 * FILTER BAR REHBER:
 * - Ana satır yüksekliği: h-9
 * - Tüm input/select ortak görünümü: `control`
 * - Çerçeve: border-destrova-border
 * - Arkaplan gradyanı: from-destrova-surfaceMuted to-white
 * - Burada sıralama: Priority -> Status -> Date -> Search -> Clear
 */

const control =
  "h-9 rounded-lg border border-[#d2d2e4] bg-gradient-to-b from-white to-[#f9f9fe] text-[13px] font-medium text-destrova-inkMuted shadow-destrova-sm transition-[border-color,box-shadow,background-color] duration-150 hover:border-destrova-primary/35 focus:border-destrova-primary/60 focus:outline-none focus:ring-2 focus:ring-destrova-primary/15";

function IconSearch(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.472 9.79l3.119 3.12a.75.75 0 1 0 1.06-1.061l-3.12-3.12A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
    </svg>
  );
}
function IconCalendar(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path fillRule="evenodd" d="M6 2a.75.75 0 0 1 .75.75V4h6.5V2.75a.75.75 0 0 1 1.5 0V4h.75A2.5 2.5 0 0 1 18 6.5v9A2.5 2.5 0 0 1 15.5 18h-11A2.5 2.5 0 0 1 2 15.5v-9A2.5 2.5 0 0 1 4.5 4h.75V2.75A.75.75 0 0 1 6 2Zm-2.5 6.5v7c0 .55.45 1 1 1h11c.55 0 1-.45 1-1v-7h-13Z" clipRule="evenodd" />
    </svg>
  );
}
function IconFlag(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M4 3a.75.75 0 0 1 .75.75V4h9.69a.75.75 0 0 1 .62 1.17l-1.9 2.83 1.9 2.83a.75.75 0 0 1-.62 1.17H4.75v5a.75.75 0 0 1-1.5 0v-14A.75.75 0 0 1 4 3Z" />
    </svg>
  );
}
function IconX(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 0 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

export default function CustomerFilterBar({
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
  priorityOptions,
  searchText,
  onSearchTextChange,
  onClearFilters,
  dateFilterRef,
  isDatePopoverOpen,
  onDatePopoverToggle,
  dateFilterLabel,
  draftDateField,
  onDraftDateFieldChange,
  draftStartDate,
  onDraftStartDateChange,
  draftEndDate,
  onDraftEndDateChange,
  onClearDateFilter,
  onApplyDateFilter,
}) {
  const statusOptions = [
    { value: "ALL", label: "All statuses" },
    ...Object.entries(CUSTOMER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const hasActiveFilters =
    (priorityFilter && priorityFilter !== "ALL") ||
    (statusFilter && statusFilter !== "ALL") ||
    !!searchText ||
    !!draftStartDate ||
    !!draftEndDate;

  return (
    <div className="w-full min-w-0">
      <div
        // Bu satır filter bar'ın kapsayıcısı: bg/border/gölge burada kontrol edilir
        className="flex w-full min-w-0 flex-nowrap items-center gap-1.5 rounded-xl border border-[#d5d5e7] bg-gradient-to-r from-[#f3f2fb] via-[#fbfbff] to-[#f3f2fb] p-1.5 shadow-destrova-sm"
        role="toolbar"
        aria-label="Ticket filters"
      >
        {/* Priority filter */}
        <label className="sr-only" htmlFor="customer-priority-filter">Priority</label>
        <div className="relative shrink-0">
          <IconFlag className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-destrova-inkFaint" />
          <select
            id="customer-priority-filter"
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            className={`${control} w-[8.5rem] pl-7 pr-2.5`}
          >
            {priorityOptions.map((option) => (
              <option key={option} value={option}>
                {option === "ALL" ? "All priorities" : option.charAt(0) + option.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <label className="sr-only" htmlFor="customer-status-filter">Status</label>
        <div className="relative shrink-0">
          <select
            id="customer-status-filter"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className={`${control} w-[11rem] px-2.5`}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Date filter */}
        <div className="relative w-[14.5rem] shrink-0" ref={dateFilterRef}>
          <button
            type="button"
            onClick={() => onDatePopoverToggle((prev) => !prev)}
            className={`${control} flex h-9 w-full items-center gap-2 px-2.5 text-left`}
            aria-expanded={isDatePopoverOpen}
          >
            <IconCalendar className="h-3.5 w-3.5 shrink-0 text-destrova-inkFaint" />
            <span className="min-w-0 flex-1 truncate text-[12px] leading-tight text-destrova-inkMuted">
              {dateFilterLabel}
            </span>
            <span className="shrink-0 text-[10px] text-destrova-inkFaint" aria-hidden>▾</span>
          </button>

          {isDatePopoverOpen ? (
            <CustomerDateFilterPopover
              draftDateField={draftDateField}
              onDraftDateFieldChange={onDraftDateFieldChange}
              draftStartDate={draftStartDate}
              onDraftStartDateChange={onDraftStartDateChange}
              draftEndDate={draftEndDate}
              onDraftEndDateChange={onDraftEndDateChange}
              onClear={onClearDateFilter}
              onApply={onApplyDateFilter}
            />
          ) : null}
        </div>

        {/* Search */}
        <label className="min-w-0 flex-1" htmlFor="customer-ticket-search">
          <span className="sr-only">Search tickets</span>
          <div className="relative min-w-[10rem]">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-destrova-inkFaint" />
            <input
              id="customer-ticket-search"
              type="search"
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              placeholder="Search by ticket ID, title, or product"
              className={`${control} box-border h-9 w-full min-w-0 py-0 pl-8 pr-2.5 text-[13px] placeholder:text-destrova-inkFaint`}
            />
          </div>
        </label>

        {/* Clear */}
        <button
          type="button"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[12.5px] font-medium transition-colors duration-150 ${
            hasActiveFilters
              ? "text-destrova-inkMuted hover:bg-white hover:text-destrova-ink"
              : "cursor-not-allowed text-destrova-inkFaint/70"
          }`}
          title="Clear filters"
        >
          <IconX className="h-3 w-3" />
          Clear
        </button>
      </div>
    </div>
  );
}
