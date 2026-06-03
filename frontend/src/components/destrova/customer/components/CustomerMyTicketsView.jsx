import { useMemo, useRef } from "react";
import CustomerFilterBar from "./CustomerFilterBar";
import CustomerTicketCard from "./CustomerTicketCard";

/*
 * MY TICKETS SAYFASI REHBER:
 * - Dış boşluklar: px-6 py-8 (desktop: md:px-10 md:py-10)
 * - Max genişlik: max-w-6xl
 * - Hero başlık boyutu: text-[30px] / md:text-[36px]
 * - Ana içerik kartı: rounded-2xl border bg-destrova-surface shadow-destrova-card
 * - New request: customer shell topbar (same control as agent); empty state may still link via onNewTicket.
 * - Tab alt çizgisi: bg-destrova-brand (aktif sekme göstergesi)
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
      className={`flex w-full min-w-0 cursor-pointer appearance-none items-center gap-1 border-0 bg-transparent p-0 font-sans shadow-none outline-none ring-0 transition-colors focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-destrova-primary/25 focus-visible:ring-offset-0 ${alignClass} text-[11px] font-semibold uppercase tracking-[0.1em] ${active ? "text-destrova-ink" : "text-destrova-inkSoft hover:text-destrova-ink"} ${className}`}
    >
      <span>{label}</span>
      {active ? (
        <span className="ml-0.5 shrink-0 text-[9px] font-normal leading-none text-destrova-inkSoft" aria-hidden>
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

function MetricChip({ label, value, dotClass = "bg-emerald-500", accent = false }) {
  return (
    <div
      className={[
        "inline-flex min-h-[2.75rem] min-w-0 items-center gap-2.5 rounded-xl border px-3.5 py-2 shadow-destrova-md backdrop-blur-sm transition-shadow duration-150",
        accent
          ? "border-[#8686AC]/50 bg-[#EEEEF8] text-destrova-primary"
          : "border-destrova-border bg-[#f8f7fe]/90 text-destrova-inkMuted",
      ].join(" ")}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <span className="text-xl font-bold tabular-nums leading-none text-destrova-ink">{value}</span>
      <span
        className={[
          "max-w-[9rem] text-[12px] font-semibold leading-tight",
          accent ? "text-destrova-primary/80" : "text-destrova-inkSoft",
        ].join(" ")}
      >
        {label}
      </span>
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-b from-[#f3f2fb] via-[#f5f6fc] to-[#00000] px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">

        {/* ── PAGE HERO ──────────────────────────────────────────────────────── */}
        <section
          // Hero: ekranın "kimlik" alanı (başlık + metrik + ana CTA)
          className="flex animate-slide-up-fade flex-col gap-5 md:flex-row md:items-end md:justify-between"
          style={{ animationDelay: "0ms" }}
        >
          {/* Left: identity + headline */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="inline-block h-[3px] w-9 rounded-full bg-destrova-brand" />
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-destrova-primary/90">
                Customer portal · Support
              </p>
            </div>
            <h1 className="mt-3 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-destrova-ink md:text-[36px]">
              Your support requests
            </h1>
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-destrova-inkMuted">
              Track every ticket, follow updates from our team, and stay in control of how your issues are resolved.
            </p>
          </div>

          {/* Right: metrics + primary CTA */}
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <MetricChip label="open" value={activeRequestCount} dotClass="bg-emerald-500" />
          </div>
        </section>

        {/* ── CONTENT SURFACE ────────────────────────────────────────────────── */}
        <section
          // Ana liste yüzeyi: burada border/bg/shadow değişikliği genel hissi çok etkiler
          className="flex animate-slide-up-fade w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d4d3e6] bg-gradient-to-b from-[#f9f8fe]/95 via-[#f3f1fa]/92 to-[#eceaf6]/88 shadow-destrova-card backdrop-blur-[1px]"
          style={{ animationDelay: "100ms" }}
        >
          {/* Tab shelf — segmented scope control */}
          <div className="flex flex-col px-5 pb-3 pt-3.5 md:px-6">
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
              <p className="hidden text-[11.5px] text-destrova-text-muted md:block">
                Showing{" "}
                <span className="font-semibold text-destrova-inkMuted tabular-nums">
                  {totalFilteredCount}
                </span>{" "}
                {totalFilteredCount === 1 ? "request" : "requests"}
              </p>
            </div>
          </div>

          {/* Inner body */}
          <div className="flex min-w-0 flex-col gap-4 px-5 py-5 md:px-6">


            {/* Filter bar */}
            <CustomerFilterBar
              priorityFilter={priorityFilter}
              onPriorityFilterChange={onPriorityFilterChange}
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
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-destrova-border border-t-destrova-primary" />
                <p className="mt-3 text-sm text-destrova-inkSoft">Loading your requests…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-destrova-borderStrong/40 bg-destrova-surfaceRaised px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-destrova-inkSoft shadow-destrova-sm ring-1 ring-destrova-border">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M3 5.75A2.75 2.75 0 0 1 5.75 3h8.5A2.75 2.75 0 0 1 17 5.75v8.5A2.75 2.75 0 0 1 14.25 17h-8.5A2.75 2.75 0 0 1 3 14.25v-8.5Zm3.5 1.5a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Zm0 3.5a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4Z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-destrova-ink">No requests match your filters</p>
                <p className="mt-1 text-xs text-destrova-inkSoft">
                  Try clearing filters, switching tabs, or opening a new request.
                </p>
                <button
                  type="button"
                  onClick={onNewTicket}
                  className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-semibold text-destrova-primary shadow-destrova-sm ring-1 ring-inset ring-indigo-200/60 transition-colors hover:bg-destrova-primarySubtle"
                >
                  Open a new request
                  <span aria-hidden>→</span>
                </button>
              </div>
            ) : (
              <>
                {/* Ticket table */}
                <div className="min-w-0 overflow-x-auto rounded-xl border border-[#d5d4e6] bg-[#fcfbff]/92 shadow-destrova-sm backdrop-blur-[1px]">
                  <div ref={listRef} className="min-w-[760px]">
                    {/* Table header */}
                    <div className="hidden border-b border-destrova-borderMuted bg-destrova-surfaceRaised sm:block">
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
                        <div className="justify-self-end text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-destrova-inkSoft">
                          Action
                        </div>
                      </div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-destrova-borderMuted">
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
                  <label className="flex items-center gap-2 text-[11px] text-destrova-inkSoft">
                    <span className="font-medium text-destrova-inkMuted">Rows per page</span>
                    <select
                      value={pageSize}
                      onChange={(e) => onPageSizeChange(Number(e.target.value))}
                      className="h-7 rounded-md border border-destrova-border bg-white px-1.5 text-[11px] font-medium text-destrova-inkMuted shadow-destrova-sm focus:border-destrova-primary/60 focus:outline-none focus:ring-2 focus:ring-destrova-primary/15"
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
        </section>
      </div>
    </div>
  );
}
