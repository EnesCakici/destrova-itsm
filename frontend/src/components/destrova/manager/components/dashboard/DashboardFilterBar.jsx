import { MANAGER_CHROME, MANAGER_COLORS } from "../../managerTokens";
import ManagerCard from "../ManagerCard";
import ManagerPillGroup from "../ManagerPillGroup";

/**
 * Dashboard filter bar — sits above filtered analytics (ticket flow, critical, products).
 * Live KPIs and queue counts above this bar are not affected by these filters.
 */

function IconChevron({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconX({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Compact dropdown — unstyled <select> wrapped to look like a chip. */
function FilterDropdown({ label, value, options, onChange }) {
  const v = value == null ? "" : String(value);
  const isAll = v.toLowerCase().startsWith("all");
  return (
    <label
      className="group relative inline-flex items-center"
      style={{ color: MANAGER_COLORS.support }}
    >
      <span className="sr-only">{label}</span>
      <span
        className="pointer-events-none absolute left-3 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: MANAGER_COLORS.muted }}
      >
        {label}
      </span>
      <select
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-[5.5rem] pr-8 text-xs font-semibold tracking-tight outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
        style={{
          color: isAll ? MANAGER_COLORS.support : MANAGER_COLORS.dark,
          boxShadow: MANAGER_CHROME.inputInset,
        }}
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <IconChevron
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 opacity-70"
        aria-hidden
      />
    </label>
  );
}

/** Active filter count summary + clear shortcut. */
function ActiveFilterSummary({ activeCount, onClear }) {
  if (!activeCount) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="destrova-pill-group__btn--text inline-flex items-center gap-1.5"
    >
      <IconX className="h-3 w-3" />
      Clear ({activeCount})
    </button>
  );
}

const EMPTY_FILTER_OPTIONS = { product: [], priority: [], status: [] };

export default function DashboardFilterBar({
  filters,
  onChange,
  ranges: rangesProp,
  filterOptions: filterOptionsProp,
}) {
  const ranges = rangesProp ?? [];
  const filterOptions = { ...EMPTY_FILTER_OPTIONS, ...(filterOptionsProp ?? {}) };

  const set = (key) => (value) => onChange({ ...filters, [key]: value });

  const activeCount = [
    filters.product !== "All products",
    filters.priority !== "All priorities",
    filters.status !== "All statuses",
  ].filter(Boolean).length;

  const clearAll = () =>
    onChange({
      ...filters,
      product: "All products",
      priority: "All priorities",
      status: "All statuses",
    });

  return (
    <ManagerCard padding="p-3 md:p-4" tone="muted" topAccent={false}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <ManagerPillGroup
          ariaLabel="Date range"
          value={filters.range}
          onChange={set("range")}
          options={ranges}
        />

        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            label="Product"
            value={filters.product}
            options={filterOptions.product ?? []}
            onChange={set("product")}
          />
          <FilterDropdown
            label="Priority"
            value={filters.priority}
            options={filterOptions.priority ?? []}
            onChange={set("priority")}
          />
          <FilterDropdown
            label="Status"
            value={filters.status}
            options={filterOptions.status ?? []}
            onChange={set("status")}
          />
          <ActiveFilterSummary activeCount={activeCount} onClear={clearAll} />
        </div>
      </div>
    </ManagerCard>
  );
}
