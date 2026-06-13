import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ManagerCard from "../ManagerCard";
import ManagerFilterDropdown from "../ManagerFilterDropdown";
import ManagerPillGroup from "../ManagerPillGroup";
import { FILTER_ALL } from "../../utils/managerFilterCodes";
import {
  buildPriorityFilterOptions,
  buildProductFilterOptions,
  buildStatusFilterOptions,
  translateDashboardRangeId,
} from "../../utils/managerFilterI18n";

/**
 * Dashboard filter bar — sits above filtered analytics (ticket flow, critical, products).
 * Live KPIs and queue counts above this bar are not affected by these filters.
 */

function IconX({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Active filter count summary + clear shortcut. */
function ActiveFilterSummary({ activeCount, onClear, clearLabel }) {
  if (!activeCount) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="destrova-pill-group__btn--text inline-flex items-center gap-1.5"
    >
      <IconX className="h-3 w-3" />
      {clearLabel}
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
  const { t } = useTranslation("manager");
  const { t: tc } = useTranslation("common");

  const ranges = useMemo(
    () =>
      (rangesProp ?? []).map((r) => ({
        id: r.id,
        label: translateDashboardRangeId(r.id, t),
      })),
    [rangesProp, t],
  );

  const filterOptions = { ...EMPTY_FILTER_OPTIONS, ...(filterOptionsProp ?? {}) };

  const productOptions = useMemo(
    () => buildProductFilterOptions(filterOptions.product ?? [], t),
    [filterOptions.product, t],
  );
  const priorityOptions = useMemo(
    () => buildPriorityFilterOptions(t, tc),
    [t, tc],
  );
  const statusOptions = useMemo(
    () => buildStatusFilterOptions(t, tc),
    [t, tc],
  );

  const set = (key) => (value) => onChange({ ...filters, [key]: value });

  const activeCount = [
    filters.product !== FILTER_ALL,
    filters.priority !== FILTER_ALL,
    filters.status !== FILTER_ALL,
  ].filter(Boolean).length;

  const clearAll = () =>
    onChange({
      ...filters,
      product: FILTER_ALL,
      priority: FILTER_ALL,
      status: FILTER_ALL,
    });

  return (
    <ManagerCard padding="p-3 md:p-4" tone="muted" topAccent={false}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <ManagerPillGroup
          ariaLabel={t("filters.dateRange")}
          value={filters.range}
          onChange={set("range")}
          options={ranges}
        />

        <div className="flex flex-wrap items-center gap-2">
          <ManagerFilterDropdown
            label={t("filters.product")}
            value={filters.product}
            options={productOptions}
            onChange={set("product")}
          />
          <ManagerFilterDropdown
            label={t("filters.priority")}
            value={filters.priority}
            options={priorityOptions}
            onChange={set("priority")}
          />
          <ManagerFilterDropdown
            label={t("filters.status")}
            value={filters.status}
            options={statusOptions}
            onChange={set("status")}
          />
          <ActiveFilterSummary
            activeCount={activeCount}
            onClear={clearAll}
            clearLabel={t("filters.clearCount", { count: activeCount })}
          />
        </div>
      </div>
    </ManagerCard>
  );
}
