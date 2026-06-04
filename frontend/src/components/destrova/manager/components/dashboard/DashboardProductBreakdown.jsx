import { useMemo } from "react";
import { MANAGER_CHROME, MANAGER_COLORS, MANAGER_STATUS } from "../../managerTokens";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";

/**
 * Product breakdown — structured rows with name, count, %, and a visual bar.
 *
 * Inputs:
 *   - productBreakdown : rows for the selected range (from dashboard data hook)
 *   - selectedProduct  : "All products" | one specific product label
 *
 * When `selectedProduct` is a specific product, that row is highlighted and
 * the others are slightly faded, so the chart behaves like a focused query.
 *
 * Row data is supplied by the parent (`productBreakdown`).
 */

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

export default function DashboardProductBreakdown({ rangeLabel, selectedProduct, productBreakdown }) {
  const data = productBreakdown ?? [];
  const isFiltered = selectedProduct && selectedProduct !== "All products";

  const max = useMemo(() => Math.max(...data.map((r) => r.count), 1), [data]);
  const total = useMemo(() => data.reduce((a, r) => a + r.count, 0), [data]);

  return (
    <ManagerCard padding="p-6 md:p-7" tone="default" elevated>
      <ManagerCardHeader
        title="Breakdown by product"
        hint={
          isFiltered
            ? `Filtered to ${selectedProduct} · ${rangeLabel}`
            : `${total} tickets · ${rangeLabel}`
        }
        action={
          <span
            className="hidden text-[10.5px] font-semibold uppercase tracking-[0.14em] sm:inline-block"
            style={{ color: MANAGER_COLORS.muted }}
          >
            Count · Share · Δ
          </span>
        }
      />
      <ul className="mt-4 space-y-1">
        {data.map((row) => (
          <ProductRow
            key={row.name}
            row={row}
            max={max}
            focused={isFiltered && row.name === selectedProduct}
            dimmed={isFiltered && row.name !== selectedProduct}
          />
        ))}
      </ul>
    </ManagerCard>
  );
}
