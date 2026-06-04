import { useMemo, useRef } from "react";
import { CUSTOMER_PAGE } from "../customerTokens";
import CustomerFilterBar from "./CustomerFilterBar";
import CustomerTicketCard from "./CustomerTicketCard";

/*
 * MY TICKETS SAYFASI REHBER:
 * - Dış boşluklar: px-6 py-8 (desktop: md:px-10 md:py-10)
 * - Max genişlik: max-w-6xl
 * - Hero başlık boyutu: text-[30px] / md:text-[36px]
 * - Ana içerik: flat white page (CUSTOMER_PAGE), table on white + gray-200 border
 * - New request: customer shell topbar (same control as agent); empty state may still link via onNewTicket.
 * - Tab: .destrova-segmented-tabs (mavi aktif durum — index.css)
 */

/* Must match TICKET_LIST_GRID in CustomerTicketCard.jsx */
const TICKET_LIST_GRID =
  "grid grid-cols-[84px_minmax(0,1fr)_120px_180px_140px] items-center gap-x-4 px-5";

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function SortHeader({ label, active, direction, onClick, align = "left", className = "" }) {
  const alignClass =
    align === "right"
      ? "justify-end text-right"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start text-left";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full min-w-0 cursor-pointer appearance-none items-center gap-1 border-0 bg-transparent p-0 font-sans shadow-none outline-none ring-0 transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:ring-offset-0 ${alignClass} text-[11px] font-semibold uppercase tracking-[0.1em] ${active ? "text-gray-900" : "text-slate-500 hover:text-gray-900"} ${className}`}
    >
      <span>{label}</span>
      {active ? (
        <span className="ml-0.5 shrink-0 text-[9px] font-normal leading-none text-slate-500" aria-hidden>
          {direction === "asc" ? "▲" : "▼"}
        </span>
      ) : null}
    </button>
  );
}

function PageNumberTab({ n, page, onPageChange }) {
  const id = `customer-my-tickets-page-${n}`;
  return (
    <div className="destrova-page-tabs__group">
      <input
        type="radio"
        name="customer-my-tickets-page"
        id={id}
        checked={page === n}
        onChange={() => onPageChange(n)}
        aria-label={`Page ${n}`}
      />
      <label htmlFor={id}>{n}</label>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export default function CustomerMyTicketsView({
  rows,
  totalFilteredCount,
  loading,
  error,
  listTab,
  onListTabChange,
  activeRequestCount,
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
  sortKey,
  sortDir,
  onSort,
  priorityClass,
  formatDate,
  onViewDetails,
  seenUpdatedAtByTicket = {},
  updatesBannerCount,
  onViewUpdates,
  onDismissUpdateBanner,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onNewTicket,
}) {
  const listRef = useRef(null);
  const lastSortKey = listTab === "PAST" ? "closedAt" : "createdAt";

  const totalPages = Math.max(1, Math.ceil((totalFilteredCount || 0) / pageSize));

  const pastCount = useMemo(
    () => (listTab === "PAST" ? totalFilteredCount : null),
    [listTab, totalFilteredCount],
  );

  return (
    // Bu katman sayfanın canvas içindeki konumunu ve nefes alan boşlukları belirler
    <div className={CUSTOMER_PAGE.root}>
      <div className={`${CUSTOMER_PAGE.innerWide} animate-slide-up-fade`} style={{ animationDelay: "0ms" }}>
        <header className={`${CUSTOMER_PAGE.heroBanner} mb-8`}>
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-blue-400/20 blur-2xl"
          />
          <div className={`relative ${CUSTOMER_PAGE.heroRow}`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span aria-hidden className="inline-block h-[3px] w-9 shrink-0 rounded-full bg-white/80" />
                <p className={CUSTOMER_PAGE.heroBannerEyebrow}>Customer portal · Support</p>
              </div>
              <h1 className={CUSTOMER_PAGE.heroBannerTitle}>Your support requests</h1>
              <p className={CUSTOMER_PAGE.heroBannerDesc}>
                Track every ticket, follow updates from our team, and stay in control of how your issues are resolved.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              <div className={CUSTOMER_PAGE.heroBannerMetric}>
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300" aria-hidden />
                <span className="text-xl font-bold tabular-nums leading-none text-white">
                  {activeRequestCount}
                </span>
                <span className="max-w-[9rem] text-[12px] font-semibold leading-tight text-blue-50">
                  open
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-w-0 flex-col gap-5 pt-2">
          <div className="flex flex-col pb-1">
            <div className="flex items-center justify-between gap-3">

              {/* Tabs — Uiverse-style segmented control (see index.css .destrova-segmented-tabs) */}
              <div role="tablist" aria-label="Ticket scope" className="destrova-segmented-tabs">
                <div className="destrova-segmented-tabs__item">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={listTab === "ACTIVE"}
                    onClick={() => onListTabChange("ACTIVE")}
                    className="destrova-segmented-tabs__label"
                  >
                    <span>Active requests</span>
                    <span className="destrova-segmented-tabs__count">{activeRequestCount}</span>
                  </button>
                </div>
                <div className="destrova-segmented-tabs__item">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={listTab === "PAST"}
                    onClick={() => onListTabChange("PAST")}
                    className="destrova-segmented-tabs__label"
                  >
                    <span>Past requests</span>
                    {pastCount !== null ? (
                      <span className="destrova-segmented-tabs__count">{pastCount}</span>
                    ) : null}
                  </button>
                </div>
              </div>

              {/* Result count */}
              <p className="hidden text-[11.5px] text-gray-500 md:block">
                Showing{" "}
                <span className="font-semibold text-gray-700 tabular-nums">
                  {totalFilteredCount}
                </span>{" "}
                {totalFilteredCount === 1 ? "request" : "requests"}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4 pb-6">


            {/* Filter bar */}
            <CustomerFilterBar
              priorityFilter={priorityFilter}
              onPriorityFilterChange={onPriorityFilterChange}
              statusFilter={statusFilter}
              onStatusFilterChange={onStatusFilterChange}
              priorityOptions={priorityOptions}
              searchText={searchText}
              onSearchTextChange={onSearchTextChange}
              onClearFilters={onClearFilters}
              dateFilterRef={dateFilterRef}
              isDatePopoverOpen={isDatePopoverOpen}
              onDatePopoverToggle={onDatePopoverToggle}
              dateFilterLabel={dateFilterLabel}
              draftDateField={draftDateField}
              onDraftDateFieldChange={onDraftDateFieldChange}
              draftStartDate={draftStartDate}
              onDraftStartDateChange={onDraftStartDateChange}
              draftEndDate={draftEndDate}
              onDraftEndDateChange={onDraftEndDateChange}
              onClearDateFilter={onClearDateFilter}
              onApplyDateFilter={onApplyDateFilter}
            />

            {/* Error */}
            {error ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-sm font-medium text-rose-700">
                {error}
              </p>
            ) : null}

            {/* List states */}
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
                <p className="mt-3 text-sm text-slate-500">Loading your requests…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-customer-card border border-dashed border-gray-300 bg-slate-50 px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-customer-card bg-white text-slate-500 shadow-customer-card ring-1 ring-gray-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M3 5.75A2.75 2.75 0 0 1 5.75 3h8.5A2.75 2.75 0 0 1 17 5.75v8.5A2.75 2.75 0 0 1 14.25 17h-8.5A2.75 2.75 0 0 1 3 14.25v-8.5Zm3.5 1.5a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Zm0 3.5a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4Z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">No requests match your filters</p>
                <p className="mt-1 text-xs text-slate-500">
                  Try clearing filters, switching tabs, or opening a new request.
                </p>
                <button
                  type="button"
                  onClick={onNewTicket}
                  className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-customer-button border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 shadow-customer-card transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  Open a new request
                  <span aria-hidden>→</span>
                </button>
              </div>
            ) : (
              <>
                {/* Ticket table */}
                <div className="min-w-0 overflow-x-auto rounded-customer-card border border-gray-200">
                  <div ref={listRef} className="min-w-[760px]">
                    {/* Table header */}
                    <div className="hidden border-b border-gray-200 bg-slate-50 sm:block">
                      <div className={`${TICKET_LIST_GRID} py-2.5`}>
                        <div className="min-w-0 justify-self-start">
                          <SortHeader label="ID" active={sortKey === "id"} direction={sortDir} onClick={() => onSort("id")} align="left" />
                        </div>
                        <div className="min-w-0 justify-self-start">
                          <SortHeader label="Request" active={sortKey === "title"} direction={sortDir} onClick={() => onSort("title")} align="left" />
                        </div>
                        <div className="flex min-w-0 justify-center justify-self-center">
                          <SortHeader label="Priority" active={sortKey === "priority"} direction={sortDir} onClick={() => onSort("priority")} align="center" />
                        </div>
                        <div className="min-w-0 justify-self-end">
                          <SortHeader
                            label={listTab === "PAST" ? "Closed" : "Created"}
                            active={sortKey === lastSortKey}
                            direction={sortDir}
                            onClick={() => onSort(lastSortKey)}
                            align="right"
                          />
                        </div>
                        <div className="justify-self-end text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                          Action
                        </div>
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-200">
                      {rows.map((ticket) => (
                        <CustomerTicketCard
                          key={ticket.id}
                          ticket={ticket}
                          priorityClass={priorityClass}
                          formatDate={formatDate}
                          onViewDetails={onViewDetails}
                          listTab={listTab}
                          seenUpdatedAtByTicket={seenUpdatedAtByTicket}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                <div className="flex flex-col items-center justify-between gap-3 pt-1 sm:flex-row">
                  <div
                    className="destrova-page-tabs"
                    role="navigation"
                    aria-label="Ticket list pages"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <PageNumberTab key={n} n={n} page={page} onPageChange={onPageChange} />
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-medium text-gray-600">Rows per page</span>
                    <select
                      value={pageSize}
                      onChange={(e) => onPageSizeChange(Number(e.target.value))}
                      className="h-7 rounded-customer-button border border-gray-200 bg-white px-1.5 text-[11px] font-medium text-gray-600 shadow-customer-card focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    >
                      {[5, 10, 20].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
