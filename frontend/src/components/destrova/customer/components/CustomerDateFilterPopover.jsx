const DATE_FIELD_OPTIONS = [
  { value: "CREATED_AT", label: "Created Date" },
  { value: "SLA_DUE_DATE", label: "SLA Due" },
];

/*
 * DATE FILTER POPOVER REHBER:
 * - Genişlik: w-[19.5rem]
 * - Arkaplan: bg-white
 * - Dış gölge: shadow-destrova-xl (yüzen panel etkisi)
 * - Açılış animasyonu: animate-fade-in
 * - Input ortak stili: `field` değişkeni
 */

export default function CustomerDateFilterPopover({
  draftDateField,
  onDraftDateFieldChange,
  draftStartDate,
  onDraftStartDateChange,
  draftEndDate,
  onDraftEndDateChange,
  onClear,
  onApply,
}) {
  const field =
    "h-8 rounded-md border border-destrova-border bg-white px-2 text-xs font-medium text-destrova-inkMuted shadow-destrova-sm transition-[border-color,box-shadow] duration-150 focus:border-destrova-primary/60 focus:outline-none focus:ring-2 focus:ring-destrova-primary/15";

  return (
    <div
      // absolute: filter butonunun altına açılır panel olarak konumlanır
      className="absolute left-0 top-full z-[100] mt-2 w-[19.5rem] animate-fade-in rounded-xl border border-destrova-border bg-white p-3.5 shadow-destrova-xl ring-1 ring-[#505081]/8"
      role="dialog"
      aria-label="Date filter"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-destrova-inkSoft">
        Filter by date
      </p>

      <div className="space-y-3">
        <label className="block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-destrova-inkSoft">
          Type
          <select
            value={draftDateField}
            onChange={(e) => onDraftDateFieldChange(e.target.value)}
            className={`mt-1 w-full ${field} normal-case tracking-normal`}
          >
            {DATE_FIELD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-destrova-inkSoft">
            Range
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="date"
              value={draftStartDate}
              onChange={(e) => onDraftStartDateChange(e.target.value)}
              className={`min-w-0 flex-1 ${field}`}
            />
            <span className="shrink-0 px-0.5 text-[11px] font-medium text-destrova-inkFaint">to</span>
            <input
              type="date"
              value={draftEndDate}
              onChange={(e) => onDraftEndDateChange(e.target.value)}
              className={`min-w-0 flex-1 ${field}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-destrova-borderMuted pt-2.5">
          <button
            type="button"
            onClick={onClear}
            className="h-8 rounded-md px-2.5 text-xs font-semibold text-destrova-inkMuted transition-colors hover:bg-destrova-surfaceMuted hover:text-destrova-ink"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onApply}
            className="h-8 rounded-md bg-destrova-brand px-3.5 text-xs font-semibold text-white shadow-destrova-cta transition-transform duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destrova-primary"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
