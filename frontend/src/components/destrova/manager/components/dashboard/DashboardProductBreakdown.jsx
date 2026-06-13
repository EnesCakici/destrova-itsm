import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MANAGER_CHROME, MANAGER_COLORS, MANAGER_STATUS } from "../../managerTokens";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";
import { FILTER_ALL } from "../../utils/managerFilterCodes";

function DeltaChip({ value }) {
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const color =
    dir === "up" ? MANAGER_STATUS.safe.fg : dir === "down" ? MANAGER_STATUS.breached.fg : MANAGER_COLORS.muted;
  const bg =
    dir === "up" ? MANAGER_STATUS.safe.bg : dir === "down" ? MANAGER_STATUS.breached.bg : MANAGER_CHROME.pillTray;
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "—";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums"
      style={{ color, backgroundColor: bg }}
    >
      <span className="text-[8px]">{arrow}</span>
      {Math.abs(value)}%
    </span>
  );
}

function ProductRow({ row, focused, dimmed, max }) {
  const widthPct = Math.max(2, Math.round((row.count / max) * 100));
  return (
    <li
      className="grid grid-cols-[minmax(0,1.4fr)_auto_minmax(0,2fr)_auto] items-center gap-3 rounded-lg px-3 py-2.5 transition-[background-color,opacity] duration-150 hover:bg-slate-50"
      style={{ opacity: dimmed ? 0.5 : 1 }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: focused ? MANAGER_COLORS.primary : MANAGER_COLORS.muted }}
        />
        <p className="truncate text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>
          {row.name}
        </p>
      </div>

      <p className="text-xs tabular-nums" style={{ color: MANAGER_COLORS.support }}>
        {row.count}
      </p>

      <div className="flex items-center gap-2 min-w-0">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: MANAGER_CHROME.trackBg }}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${widthPct}%`,
              backgroundColor: focused ? MANAGER_COLORS.primary : MANAGER_COLORS.muted,
            }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>
          {row.pct}%
        </span>
      </div>

      <DeltaChip value={row.deltaPct} />
    </li>
  );
}

export default function DashboardProductBreakdown({
  rangeLabel,
  selectedProduct,
  productBreakdown,
  filterSuffix,
}) {
  const { t } = useTranslation("manager");
  const data = productBreakdown ?? [];
  const isProductFiltered = selectedProduct && selectedProduct !== FILTER_ALL;

  const max = useMemo(() => Math.max(...data.map((r) => r.count), 1), [data]);
  const total = useMemo(() => data.reduce((a, r) => a + r.count, 0), [data]);

  const hint = filterSuffix
    ? `${filterSuffix} · ${rangeLabel}`
    : isProductFiltered
      ? `${selectedProduct} · ${rangeLabel}`
      : t("dashboard.productBreakdown.hintTickets", { count: total, range: rangeLabel });

  return (
    <ManagerCard padding="p-6 md:p-7" tone="default" elevated>
      <ManagerCardHeader
        title={t("dashboard.productBreakdown.title")}
        hint={hint}
        action={
          <span
            className="hidden text-[10.5px] font-semibold uppercase tracking-[0.14em] sm:inline-block"
            style={{ color: MANAGER_COLORS.muted }}
          >
            {t("dashboard.productBreakdown.columns")}
          </span>
        }
      />
      {data.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: MANAGER_COLORS.support }}>
          {t("dashboard.productBreakdown.empty")}
        </p>
      ) : (
      <ul className="mt-4 space-y-1">
        {data.map((row) => (
          <ProductRow
            key={row.name}
            row={row}
            max={max}
            focused={isProductFiltered && row.name === selectedProduct}
            dimmed={isProductFiltered && row.name !== selectedProduct}
          />
        ))}
      </ul>
      )}
    </ManagerCard>
  );
}
