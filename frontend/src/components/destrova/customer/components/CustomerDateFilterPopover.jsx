import { SAAS_BUTTON } from "../../shared/saasPlatformTokens";

const DATE_FIELD_OPTIONS = [
  { value: "CREATED_AT", label: "Created Date" },
  { value: "SLA_DUE_DATE", label: "SLA Due" },
];

/*
 * DATE FILTER POPOVER — enterprise SaaS (Adım 7)
 * - Panel: white, gray-200 border, light dropdown shadow
 * - Inputs: #E5E7EB border, blue focus ring
 * - Apply CTA: blue-600 (not destrova-brand purple)
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
    "h-8 rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-600 shadow-sm transition-[border-color,box-shadow] duration-150 focus:border-blue-600/60 focus:outline-none focus:ring-2 focus:ring-blue-600/15";

  return (
    <div
      // absolute: filter butonunun altına açılır panel olarak konumlanır
      className="absolute left-0 top-full z-[100] mt-2 w-[19.5rem] animate-fade-in rounded-xl border border-gray-200 bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_20px_rgba(15,23,42,0.08)]"
      role="dialog"
      aria-label="Date filter"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        Filter by date
      </p>

      <div className="space-y-3">
        <label className="block text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-500">
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
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-500">
            Range
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="date"
              value={draftStartDate}
              onChange={(e) => onDraftStartDateChange(e.target.value)}
              className={`min-w-0 flex-1 ${field}`}
            />
            <span className="shrink-0 px-0.5 text-[11px] font-medium text-gray-400">to</span>
            <input
              type="date"
              value={draftEndDate}
              onChange={(e) => onDraftEndDateChange(e.target.value)}
              className={`min-w-0 flex-1 ${field}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-2.5">
          <button
            type="button"
            onClick={onClear}
            className="h-8 rounded-md px-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-slate-50 hover:text-gray-900"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onApply}
            className={`h-8 px-3.5 ${SAAS_BUTTON.primarySm}`}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
