import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatReportChartLabel } from "../../utils/managerReportsI18n";
import { MANAGER_CHROME, MANAGER_COLORS, MANAGER_STATUS } from "../../managerTokens";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";
import ManagerPillGroup from "../ManagerPillGroup";

/**
 * Interactive Ticket Flow chart.
 *
 * Driven by:
 *   - `ticketFlow` for the selected range (today | 7d | 30d) from the dashboard data hook
 *   - local "compare to" toggle (none | previous | lastWeek)
 *
 * `ticketFlow` is the range slice (axis + current + previous + lastWeek) from the parent.
 */

function normalizeTicketFlow(raw) {
  if (raw == null) {
    return { axis: [], current: [], previous: [], lastWeek: [] };
  }
  return {
    axis: Array.isArray(raw.axis) ? raw.axis : [],
    current: Array.isArray(raw.current) ? raw.current : [],
    previous: Array.isArray(raw.previous) ? raw.previous : [],
    lastWeek: Array.isArray(raw.lastWeek) ? raw.lastWeek : [],
  };
}

const COMPARISON_IDS = ["none", "previous", "lastWeek"];

/** Series paint — blue primary for created; semantic green for resolved. */
const FLOW = {
  created: MANAGER_COLORS.primary,
  createdLine: MANAGER_COLORS.primary,
  resolved: MANAGER_STATUS.safe.fg,
  resolvedLine: "rgba(34,197,94,0.92)",
  grid: MANAGER_CHROME.chartGrid,
  gridDash: "5 6",
  compareCreated: "rgba(37,99,235,0.35)",
  compareResolved: "rgba(34,197,94,0.38)",
};

/* ── Stat block ─────────────────────────────────────── */
function FlowStat({ label, value, accent, sublabel, sublabelColor }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums md:text-[28px]"
        style={{ color: accent || MANAGER_COLORS.dark }}
      >
        {value}
      </p>
      {sublabel ? (
        <p
          className="mt-1.5 truncate text-[11px] leading-snug"
          style={{ color: sublabelColor ?? MANAGER_COLORS.support }}
        >
          {sublabel}
        </p>
      ) : null}
    </div>
  );
}

/* ── Chart ─────────────────────────────────────── */
function FlowChart({ axis, current, compare }) {
  const { t } = useTranslation("manager");
  const reactId = useId().replace(/:/g, "");
  const gCreated = `mgrflow-${reactId}-g-created`;
  const gResolved = `mgrflow-${reactId}-g-resolved`;
  const [hoverI, setHoverI] = useState(null);

  const W = 720;
  const H = 220;
  const PAD_X = 28;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 32;

  const allValues = current.flatMap((d) => [d.created, d.resolved]);
  const compareValues = compare ? compare.flatMap((d) => [d.created, d.resolved]) : [];
  const max = Math.max(1, ...allValues, ...compareValues) * 1.12;

  const n = Math.max(1, axis.length);
  const stepX = (W - PAD_X * 2) / Math.max(1, n - 1);
  const xFor = (i) => PAD_X + i * stepX;
  const yFor = (v) => H - PAD_BOTTOM - (v / max) * (H - PAD_TOP - PAD_BOTTOM);

  const buildPath = (series, key) =>
    series.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`).join(" ");
  const buildArea = (series, key) =>
    `${buildPath(series, key)} L ${xFor(series.length - 1).toFixed(1)} ${H - PAD_BOTTOM} L ${xFor(0).toFixed(1)} ${H - PAD_BOTTOM} Z`;

  // Light horizontal guides
  const gridLines = [0.25, 0.5, 0.75].map((t, i) => (
    <line
      key={`g-${i}`}
      x1={PAD_X}
      x2={W - PAD_X}
      y1={PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * t}
      y2={PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * t}
      stroke={FLOW.grid}
      strokeWidth="0.9"
      strokeDasharray={FLOW.gridDash}
      vectorEffect="non-scaling-stroke"
    />
  ));

  const hitWidth = n <= 1 ? W - PAD_X * 2 : stepX;
  const hitLeft = (i) => (n <= 1 ? PAD_X : xFor(i) - hitWidth / 2);

  const tooltip = useMemo(() => {
    if (hoverI == null) return null;
    const d = current[hoverI];
    if (!d) return null;
    const c = d.created ?? 0;
    const r = d.resolved ?? 0;
    const net = c - r;
    const label = axis[hoverI] ?? "—";
    return { c, r, net, label };
  }, [hoverI, current, axis]);

  const tipLeftPct = hoverI != null ? Math.max(9, Math.min(91, (xFor(hoverI) / W) * 100)) : 50;

  return (
    <div className="relative -mx-2 mt-6">
      <div className="overflow-visible rounded-md">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full select-none"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("dashboard.flow.chartAria")}
        >
          <defs>
            <linearGradient id={gCreated} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={FLOW.createdLine} stopOpacity="0.12" />
              <stop offset="100%" stopColor={FLOW.createdLine} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={gResolved} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={MANAGER_STATUS.safe.fg} stopOpacity="0.11" />
              <stop offset="100%" stopColor={MANAGER_STATUS.safe.fg} stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridLines}

          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={H - PAD_BOTTOM}
            y2={H - PAD_BOTTOM}
            stroke={MANAGER_CHROME.trackBg}
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
          />

          {compare ? (
            <>
              <path
                d={buildPath(compare, "created")}
                fill="none"
                stroke={FLOW.compareCreated}
                strokeWidth="1.15"
                strokeDasharray="4 4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={0.88}
              />
              <path
                d={buildPath(compare, "resolved")}
                fill="none"
                stroke={FLOW.compareResolved}
                strokeWidth="1.1"
                strokeDasharray="3 3"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                opacity={0.8}
              />
            </>
          ) : null}

          <path d={buildArea(current, "resolved")} fill={`url(#${gResolved})`} />
          <path d={buildArea(current, "created")} fill={`url(#${gCreated})`} />

          <path
            d={buildPath(current, "resolved")}
            fill="none"
            stroke={FLOW.resolvedLine}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.95}
          />
          <path
            d={buildPath(current, "created")}
            fill="none"
            stroke={FLOW.createdLine}
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.98}
          />

          {current.map((d, i) => (
            <g key={`pt-${i}`} style={{ pointerEvents: "none" }}>
              <circle
                cx={xFor(i)}
                cy={yFor(d.resolved ?? 0)}
                r="2.25"
                fill={MANAGER_COLORS.surface}
                stroke={FLOW.resolvedLine}
                strokeWidth="1.1"
                opacity={0.95}
              />
              <circle
                cx={xFor(i)}
                cy={yFor(d.created ?? 0)}
                r="2.5"
                fill={FLOW.createdLine}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="0.8"
                opacity={0.98}
              />
            </g>
          ))}

          {hoverI != null ? (
            <line
              x1={xFor(hoverI)}
              x2={xFor(hoverI)}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              stroke="rgba(15,23,42,0.1)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {axis.map((label, i) => (
            <text
              key={`x-${i}`}
              x={xFor(i)}
              y={H - 8}
              fontSize="10.5"
              textAnchor="middle"
              fill={MANAGER_COLORS.muted}
              className="font-medium"
              style={{ fontFamily: "inherit" }}
            >
              {label}
            </text>
          ))}

          {current.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={hitLeft(i)}
              y={PAD_TOP - 2}
              width={hitWidth}
              height={H - PAD_TOP - PAD_BOTTOM + 4}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverI(i)}
              onMouseLeave={() => setHoverI(null)}
            />
          ))}
        </svg>
      </div>

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-10 min-w-[9.5rem] max-w-[14rem] rounded-md border border-gray-200 bg-white/98 px-2.5 py-2 text-left shadow-sm backdrop-blur-[2px] sm:min-w-[10rem]"
          style={{
            left: `${tipLeftPct.toFixed(2)}%`,
            top: 8,
            transform: "translateX(-50%)",
            boxShadow: "0 4px 16px rgba(15,23,42,0.1), 0 0 0 1px rgba(15,23,42,0.06) inset",
          }}
        >
          <p
            className="mb-1.5 border-b border-gray-100 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-balance"
            style={{ color: MANAGER_COLORS.support }}
          >
            {tooltip.label}
          </p>
          <div className="space-y-1 text-[11.5px] font-medium leading-tight" style={{ color: MANAGER_COLORS.dark }}>
            <p className="flex justify-between gap-4 tabular-nums">
              <span className="font-normal" style={{ color: MANAGER_COLORS.muted }}>
                {t("dashboard.flow.created")}
              </span>
              <span style={{ color: FLOW.createdLine }}>{tooltip.c}</span>
            </p>
            <p className="flex justify-between gap-4 tabular-nums">
              <span className="font-normal" style={{ color: MANAGER_COLORS.muted }}>
                {t("dashboard.flow.resolved")}
              </span>
              <span style={{ color: FLOW.resolvedLine }}>{tooltip.r}</span>
            </p>
            <p
              className="mt-1 flex justify-between gap-3 border-t border-gray-100 pt-1.5 font-semibold tabular-nums"
              style={{ color: MANAGER_COLORS.dark }}
            >
              <span className="font-medium" style={{ color: MANAGER_COLORS.muted }}>
                {t("dashboard.flow.netBacklog")}
              </span>
              <span
                style={{
                  color:
                    tooltip.net > 0
                      ? MANAGER_STATUS.atRisk.fg
                      : tooltip.net < 0
                        ? MANAGER_STATUS.safe.fg
                        : MANAGER_COLORS.dark,
                }}
              >
                {tooltip.net > 0 ? "+" : ""}
                {tooltip.net}
              </span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Component ─────────────────────────────────────── */
export default function DashboardTicketFlow({ flowHint, rangeLabel, productLabel, ticketFlow }) {
  const { t, i18n } = useTranslation("manager");
  const [compareTo, setCompareTo] = useState("none");

  const comparisonOptions = useMemo(
    () =>
      COMPARISON_IDS.map((id) => ({
        id,
        label: t(`dashboard.flow.compare${id === "none" ? "None" : id === "previous" ? "Previous" : "LastWeek"}`),
      })),
    [t],
  );

  const data = useMemo(() => {
    const raw = normalizeTicketFlow(ticketFlow);
    return {
      ...raw,
      axis: raw.axis.map((label) => formatReportChartLabel(label, i18n.language)),
    };
  }, [ticketFlow, i18n.language]);

  const headerHint =
    flowHint && String(flowHint).trim()
      ? String(flowHint).trim()
      : `${rangeLabel || t("dashboard.ranges.7d")} · ${t("dashboard.flow.hintTemplate", { range: rangeLabel || t("dashboard.ranges.7d") }).split(" · ")[1] || ""}${productLabel ? ` · ${productLabel}` : ""}`;

  const rawCompare = compareTo === "none" ? null : data[compareTo];
  const compareSeries = Array.isArray(rawCompare) && rawCompare.length > 0 ? rawCompare : null;

  const chartReady = data.axis.length > 0 && data.current.length > 0;

  const totals = useMemo(() => {
    const created = data.current.reduce((a, d) => a + (d.created ?? 0), 0);
    const resolved = data.current.reduce((a, d) => a + (d.resolved ?? 0), 0);
    const net = created - resolved;
    return { created, resolved, net };
  }, [data]);

  const compareTotals = useMemo(() => {
    if (!compareSeries) return null;
    const created = compareSeries.reduce((a, d) => a + (d.created ?? 0), 0);
    const resolved = compareSeries.reduce((a, d) => a + (d.resolved ?? 0), 0);
    return { created, resolved };
  }, [compareSeries]);

  const deltaText = (cur, prev, suffix = "") => {
    if (prev == null || prev === 0) return null;
    const pct = Math.round(((cur - prev) / prev) * 100);
    const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "—";
    return `${arrow} ${Math.abs(pct)}% ${suffix}`.trim();
  };

  const deltaSuffix = t("dashboard.flow.deltaVsOther");

  const netValueAccent =
    totals.net > 0
      ? MANAGER_STATUS.atRisk.fg
      : totals.net < 0
        ? MANAGER_STATUS.safe.fg
        : MANAGER_COLORS.dark;
  const netSublabelColor =
    totals.net > 0
      ? MANAGER_STATUS.atRisk.fg
      : totals.net < 0
        ? MANAGER_STATUS.safe.fg
        : MANAGER_COLORS.support;

  return (
    <ManagerCard padding="p-6 md:p-7" tone="neutral" elevated>
      <ManagerCardHeader
        title={t("dashboard.flow.title")}
        hint={headerHint}
        action={
          <div className="max-w-full flex-1 pl-0 sm:pl-2">
            <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-end sm:justify-end sm:gap-3">
              <ManagerPillGroup
                ariaLabel={t("dashboard.flow.compareAria")}
                size="sm"
                value={compareTo}
                onChange={setCompareTo}
                options={comparisonOptions}
              />
              <div
                className="flex flex-wrap items-center justify-end gap-x-3.5 gap-y-2 text-[10.5px] font-medium"
                style={{ color: MANAGER_COLORS.dark }}
              >
                <span
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white/80 px-2 py-1"
                  title={t("dashboard.flow.createdTitle")}
                >
                  <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: FLOW.createdLine, opacity: 0.9 }} />
                  <span className="whitespace-nowrap" style={{ color: MANAGER_COLORS.dark }}>
                    {t("dashboard.flow.created")}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white/80 px-2 py-1"
                  title={t("dashboard.flow.resolvedTitle")}
                >
                  <span
                    className="h-0.5 w-4 rounded-full"
                    style={{ backgroundColor: MANAGER_STATUS.safe.fg, opacity: 0.9 }}
                  />
                  <span className="whitespace-nowrap" style={{ color: MANAGER_COLORS.dark }}>
                    {t("dashboard.flow.resolved")}
                  </span>
                </span>
                {compareTo !== "none" ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-200 bg-white/60 px-2 py-1"
                    title={t("dashboard.flow.compareLegend")}
                  >
                    <span
                      className="h-0.5 w-4"
                      style={{
                        background: `repeating-linear-gradient(90deg, ${MANAGER_COLORS.muted} 0, ${MANAGER_COLORS.muted} 2px, transparent 2px, 5px)`,
                        opacity: 0.75,
                      }}
                    />
                    <span className="whitespace-nowrap" style={{ color: MANAGER_COLORS.support }}>
                      {compareTo === "previous" ? t("dashboard.flow.comparePrevious") : t("dashboard.flow.compareLastWeek")}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-5 sm:max-w-md sm:grid-cols-3">
        <FlowStat
          label={t("dashboard.flow.created")}
          value={totals.created}
          accent={FLOW.createdLine}
          sublabel={compareTotals ? deltaText(totals.created, compareTotals.created, deltaSuffix) : null}
        />
        <FlowStat
          label={t("dashboard.flow.resolved")}
          value={totals.resolved}
          accent={MANAGER_STATUS.safe.fg}
          sublabel={compareTotals ? deltaText(totals.resolved, compareTotals.resolved, deltaSuffix) : null}
        />
        <FlowStat
          label={t("dashboard.flow.netBacklog")}
          value={(totals.net > 0 ? "+" : "") + totals.net}
          accent={netValueAccent}
          sublabelColor={netSublabelColor}
          sublabel={
            totals.net > 0
              ? t("dashboard.flow.backlogGrowing")
              : totals.net < 0
                ? t("dashboard.flow.backlogImproving")
                : t("dashboard.flow.backlogStable")
          }
        />
      </div>

      {chartReady ? (
        <FlowChart axis={data.axis} current={data.current} compare={compareSeries} />
      ) : null}
    </ManagerCard>
  );
}
