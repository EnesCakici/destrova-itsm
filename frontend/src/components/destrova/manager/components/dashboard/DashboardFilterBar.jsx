import { MANAGER_COLORS } from "../../managerTokens";
import ManagerCard from "../ManagerCard";

/**
 * Unified filter bar — sits at the top of the Manager Dashboard.
 *
 * Controls (all controlled — pass `filters`, `onChange`, `ranges`, `filterOptions`):
 *   - range    : "today" | "7d" | "30d"
 *   - product  : "All products" | one of filterOptions.product
 *   - priority : same shape
 *   - status   : same shape
 *
 * The bar itself is layout-only. Charts and KPIs read `filters` and
 * derive their data from the mocks keyed by the chosen range.
 *
 * Note on "Custom": removed deliberately — the picker had no real backend
 * and the user spec said NOT to leave broken UI controls. Reintroduce only
 * when paired with a working date picker + range-aware data.
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

/** Date range pill group. */
function RangePills({ value, onChange, ranges }) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-xl p-1"
      style={{
        backgroundColor: "rgba(39,39,87,0.05)",
        boxShadow: "0 0 0 1px rgba(39,39,87,0.06) inset",
      }}
      role="tablist"
      aria-label="Date range"
    >
      {ranges.map((r) => {
        const active = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-[background-color,color,box-shadow] duration-150"
            style={{
              color: active ? MANAGER_COLORS.dark : MANAGER_COLORS.support,
              backgroundColor: active ? "#FFFFFF" : "transparent",
              boxShadow: active
                ? "0 1px 2px rgba(15,14,71,0.08), 0 0 0 1px rgba(39,39,87,0.08)"
                : "none",
            }}
            aria-pressed={active}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact dropdown — unstyled <select> wrapped to look like a chip.
 * Browser-native picker keeps the surface light and accessible.
 */
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
        className="appearance-none rounded-lg pl-[5.5rem] pr-8 py-2 text-xs font-semibold tracking-tight outline-none transition-[box-shadow,background-color] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)]"
        style={{
          color: isAll ? MANAGER_COLORS.support : MANAGER_COLORS.dark,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)",
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
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight transition-[background-color,color] duration-150 hover:bg-[rgba(39,39,87,0.08)]"
      style={{ color: MANAGER_COLORS.support }}
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
        <RangePills value={filters.range} onChange={set("range")} ranges={ranges} />

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
