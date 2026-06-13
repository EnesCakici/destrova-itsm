import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useManagerReportsData, getReportDateRange } from "../../hooks/useManagerReportsData";
import { DEFAULT_MANAGER_REPORT_RANGE, MANAGER_REPORT_RANGES } from "../../data/reportsConstants";
import {
  formatReportChartLabel,
  formatReportDurationValue,
  translateReportAgentRole,
  translateReportHighlightRow,
  translateReportRangeId,
  translateReportVolumeDelta,
} from "../../utils/managerReportsI18n";
import { MANAGER_CHROME, MANAGER_COLORS, MANAGER_STATUS, SAAS_BUTTON } from "../../managerTokens";
import {
  ReportsContentSkeleton,
  ReportsMockFallbackBanner,
} from "../reports/ReportsSkeleton";
import ReportsEmptyState from "../reports/ReportsEmptyState";

/** Reports chart series — aligned with dashboard ticket flow. */
const REPORT_CHART = {
  created: MANAGER_COLORS.primary,
  createdFill: "rgba(37,99,235,0.12)",
  resolved: MANAGER_STATUS.safe.fg,
  resolvedLine: "rgba(34,197,94,0.92)",
  resolvedFill: "rgba(34,197,94,0.11)",
  grid: MANAGER_CHROME.chartGrid,
};
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";
import ManagerPillGroup from "../ManagerPillGroup";
import ManagerSurface from "../ManagerSurface";
import { exportReportCsv } from "../../api/api";

/* ── Icons ─────────────────────────────────────────────── */
function IconCalendar({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3.5" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 6.5h12M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconDownload({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Chart axis helpers ───────────────────────────────── */
const MAX_X_TICKS = 6;
const CHART_W = 720;
const CHART_PAD_X = 28;

function chartTickIndices(count, maxTicks = MAX_X_TICKS) {
  if (count <= 0) return [];
  if (count <= maxTicks) return Array.from({ length: count }, (_, i) => i);
  const step = Math.ceil((count - 1) / (maxTicks - 1));
  const indices = [];
  for (let i = 0; i < count; i += step) indices.push(i);
  if (indices[indices.length - 1] !== count - 1) indices.push(count - 1);
  return indices;
}

/** Narrow cards — first, middle, last only to prevent overlap. */
function chartTickIndicesCompact(count) {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count === 2) return [0, 1];
  if (count === 3) return [0, 1, 2];
  const mid = Math.floor((count - 1) / 2);
  return [0, mid, count - 1];
}

/** Shorter axis copy; full range stays in title + tooltip. */
function compactAxisLabel(label) {
  if (!label) return "";
  const head = String(label).split("–")[0]?.trim();
  return head || label;
}

/** HTML x-axis — labels sit below the SVG so they never clip (Stripe / dashboard pattern). */
function ChartAxisLabels({
  labels,
  tickIndices,
  xFor,
  totalWidth = CHART_W,
  count,
  activeIndex = null,
  compact = false,
}) {
  if (!tickIndices.length) return null;
  return (
    <div
      className={[
        "relative mt-2 w-full select-none",
        compact ? "h-8" : "h-10",
      ].join(" ")}
      aria-hidden
    >
      {tickIndices.map((i) => {
        const xPct = (xFor(i) / totalWidth) * 100;
        const isFirst = i === 0;
        const isLast = i === count - 1;
        const fullLabel = labels[i] ?? "";
        const label = compact ? compactAxisLabel(fullLabel) : fullLabel;
        const active = i === activeIndex;
        return (
          <span
            key={`axis-${i}-${fullLabel}`}
            className={[
              "absolute top-0 max-w-[5rem] truncate",
              compact ? "text-[10px]" : "text-[11px]",
              "leading-snug transition-colors duration-150",
              active ? "font-semibold text-slate-800" : "font-medium text-slate-500",
            ].join(" ")}
            style={
              isFirst
                ? { left: `${xPct}%`, transform: "translateX(0)" }
                : isLast
                  ? { left: `${xPct}%`, transform: "translateX(-100%)" }
                  : { left: `${xPct}%`, transform: "translateX(-50%)", textAlign: "center" }
            }
            title={fullLabel}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

/* ── Volume chart (created vs resolved over the period) ── */
function VolumeChart({ series }) {
  const { t, i18n } = useTranslation("manager");
  const [hoverI, setHoverI] = useState(null);
  const W = CHART_W;
  const H = 200;
  const PAD_X = CHART_PAD_X;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 20;

  if (!Array.isArray(series) || series.length === 0) {
    return (
      <ReportsEmptyState
        className="mt-6"
        title={t("reports.volume.emptyTitle")}
        description={t("reports.volume.emptyDesc")}
      />
    );
  }

  const max = Math.max(
    ...series.flatMap((d) => [d.created, d.resolved]),
    1
  ) * 1.15;

  const n = series.length;
  const stepX = (W - PAD_X * 2) / Math.max(n - 1, 1);
  const xFor = (i) => PAD_X + i * stepX;
  const yFor = (v) => H - PAD_BOTTOM - (v / max) * (H - PAD_TOP - PAD_BOTTOM);
  const xTickIndices = useMemo(() => chartTickIndices(n), [n]);
  const axisLabels = useMemo(
    () => series.map((d) => formatReportChartLabel(d.week ?? "", i18n.language)),
    [series, i18n.language],
  );

  const buildPath = (key) =>
    series
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`
      )
      .join(" ");
  const buildArea = (key) =>
    `${buildPath(key)} L ${xFor(series.length - 1).toFixed(1)} ${H - PAD_BOTTOM} L ${xFor(0).toFixed(1)} ${H - PAD_BOTTOM} Z`;

  // Grid çizgileri (opsiyonel)
  const gridLines = [0.25, 0.5, 0.75].map((t, i) => (
    <line
      key={`g-${i}`}
      x1={PAD_X}
      x2={W - PAD_X}
      y1={PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * t}
      y2={PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * t}
      stroke={REPORT_CHART.grid}
      strokeWidth="0.9"
      strokeDasharray="5 6"
      vectorEffect="non-scaling-stroke"
    />
  ));

  const hitWidth = n <= 1 ? W - PAD_X * 2 : stepX;
  const hitLeft = (i) => (n <= 1 ? PAD_X : xFor(i) - hitWidth / 2);

  const tooltip = useMemo(() => {
    if (hoverI == null || !series[hoverI]) return null;
    const d = series[hoverI];
    return {
      label: formatReportChartLabel(d.week, i18n.language),
      created: d.created ?? 0,
      resolved: d.resolved ?? 0,
    };
  }, [hoverI, series, i18n.language]);

  const tipLeftPct =
    hoverI != null ? Math.max(8, Math.min(92, (xFor(hoverI) / W) * 100)) : 50;

  return (
    <div className="relative mt-6">
      <div className="overflow-visible rounded-md">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full select-none"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("reports.volume.chartAria")}
        >
          <defs>
            <linearGradient id="mgr-rep-vol-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={REPORT_CHART.created} stopOpacity="0.12" />
              <stop offset="100%" stopColor={REPORT_CHART.created} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="mgr-rep-res-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={REPORT_CHART.resolved} stopOpacity="0.11" />
              <stop offset="100%" stopColor={REPORT_CHART.resolved} stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridLines}

          {/* Temel çizgi */}
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={H - PAD_BOTTOM}
            y2={H - PAD_BOTTOM}
            stroke={MANAGER_CHROME.trackBg}
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
          />

          {/* Alanlar */}
          <path d={buildArea("created")} fill="url(#mgr-rep-vol-fill)" />
          <path d={buildArea("resolved")} fill="url(#mgr-rep-res-fill)" />

          {/* Çizgiler */}
          <path
            d={buildPath("resolved")}
            fill="none"
            stroke={REPORT_CHART.resolvedLine}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={buildPath("created")}
            fill="none"
            stroke={REPORT_CHART.created}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Noktalar */}
          {series.map((d, i) => (
            <g key={`pt-${i}`}>
              <circle
                cx={xFor(i)}
                cy={yFor(d.resolved ?? 0)}
                r="3"
                fill="#fff"
                stroke={REPORT_CHART.resolvedLine}
                strokeWidth="1.2"
              />
              <circle
                cx={xFor(i)}
                cy={yFor(d.created ?? 0)}
                r="3.5"
                fill={REPORT_CHART.created}
                stroke="#fff"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Hover çizgisi */}
          {hoverI != null ? (
            <line
              x1={xFor(hoverI)}
              x2={xFor(hoverI)}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              stroke="rgba(15,23,42,0.12)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {/* Hit alanları */}
          {series.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={hitLeft(i)}
              y={PAD_TOP - 4}
              width={hitWidth}
              height={H - PAD_TOP - PAD_BOTTOM + 8}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverI(i)}
              onMouseLeave={() => setHoverI(null)}
            />
          ))}
        </svg>
      </div>

      <ChartAxisLabels
        labels={axisLabels}
        tickIndices={xTickIndices}
        xFor={xFor}
        totalWidth={W}
        count={n}
        activeIndex={hoverI}
      />

      {/* Tooltip – dashboard’takinin aynısı */}
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-20 min-w-[9rem] rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-lg"
          style={{
            left: `${tipLeftPct.toFixed(1)}%`,
            top: "0.5rem",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <p className="mb-1 border-b border-gray-100 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: MANAGER_COLORS.muted }}>
            {tooltip.label}
          </p>
          <div className="space-y-1 text-[11.5px]">
            <p className="flex justify-between gap-4 tabular-nums">
              <span style={{ color: MANAGER_COLORS.muted }}>{t("reports.volume.created")}</span>
              <span style={{ color: REPORT_CHART.created }}>{tooltip.created}</span>
            </p>
            <p className="flex justify-between gap-4 tabular-nums">
              <span style={{ color: MANAGER_COLORS.muted }}>{t("reports.volume.resolved")}</span>
              <span style={{ color: MANAGER_COLORS.support }}>{tooltip.resolved}</span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
/* ── Sparkline trend ──────────────────────────────────── */
function TrendSparkline({ data }) {
  const { t, i18n } = useTranslation("manager");
  const [hoverI, setHoverI] = useState(null);
  const W = CHART_W;
  const H = 160;
  const PAD_X = CHART_PAD_X;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 16;

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <ReportsEmptyState
        className="mt-5"
        title={t("reports.resolutionTrend.emptyTitle")}
        description={t("reports.resolutionTrend.emptyDesc")}
      />
    );
  }

  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;
  const n = data.length;
  const stepX = (W - PAD_X * 2) / Math.max(n - 1, 1);
  const xFor = (i) => PAD_X + i * stepX;
  const yFor = (v) => H - PAD_BOTTOM - ((v - min) / range) * (H - PAD_TOP - PAD_BOTTOM);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d.value).toFixed(1)}`).join(" ");
  const area = `${path} L ${xFor(n - 1).toFixed(1)} ${H - PAD_BOTTOM} L ${xFor(0).toFixed(1)} ${H - PAD_BOTTOM} Z`;
  const tickIndices = useMemo(() => chartTickIndicesCompact(n), [n]);
  const axisLabels = useMemo(
    () => data.map((d) => formatReportChartLabel(d.week ?? "", i18n.language)),
    [data, i18n.language],
  );

  const hitWidth = n <= 1 ? W - PAD_X * 2 : stepX;
  const hitLeft = (i) => (n <= 1 ? PAD_X : xFor(i) - hitWidth / 2);

  const tooltip = useMemo(() => {
    if (hoverI == null || !data[hoverI]) return null;
    const d = data[hoverI];
    return {
      label: formatReportChartLabel(d.week ?? "—", i18n.language),
      value: d.value ?? 0,
    };
  }, [hoverI, data, i18n.language]);

  const tipLeftPct =
    hoverI != null ? Math.max(10, Math.min(90, (xFor(hoverI) / W) * 100)) : 50;

  return (
    <div className="relative mt-5">
      <div className="overflow-visible rounded-md">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full select-none"
          preserveAspectRatio="none"
          role="img"
          aria-label={t("reports.resolutionTrend.chartAria")}
        >
          <defs>
            <linearGradient id="mgr-rep-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={REPORT_CHART.created} stopOpacity="0.14" />
              <stop offset="100%" stopColor={REPORT_CHART.created} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#mgr-rep-fill)" />
          <path
            d={path}
            fill="none"
            stroke={REPORT_CHART.created}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {hoverI != null ? (
            <line
              x1={xFor(hoverI)}
              x2={xFor(hoverI)}
              y1={PAD_TOP}
              y2={H - PAD_BOTTOM}
              stroke="rgba(15,23,42,0.12)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {data.map((d, i) => (
            <circle
              key={`${d.week}-${i}`}
              cx={xFor(i)}
              cy={yFor(d.value)}
              r="3"
              fill={REPORT_CHART.created}
              stroke="#fff"
              strokeWidth="1"
              style={{ pointerEvents: "none" }}
            />
          ))}
          {data.map((_, i) => (
            <rect
              key={`hit-res-${i}`}
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

      <ChartAxisLabels
        labels={axisLabels}
        tickIndices={tickIndices}
        xFor={xFor}
        totalWidth={W}
        count={n}
        activeIndex={hoverI}
        compact
      />

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-20 min-w-[8.5rem] rounded-md border border-gray-200 bg-white px-2.5 py-2 shadow-lg"
          style={{
            left: `${tipLeftPct.toFixed(1)}%`,
            top: "0.25rem",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <p
            className="mb-1 border-b border-gray-100 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: MANAGER_COLORS.muted }}
          >
            {tooltip.label}
          </p>
          <p className="flex justify-between gap-4 text-[11.5px] tabular-nums">
            <span style={{ color: MANAGER_COLORS.muted }}>{t("reports.resolutionTrend.avg")}</span>
            <span style={{ color: REPORT_CHART.created }}>{formatReportDurationValue(tooltip.value, i18n.language)}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ── Highlight metric block ───────────────────────────── */
function HighlightCard({ row, tone = "primary" }) {
  return (
    <ManagerCard padding="p-6" tone={tone} interactive>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>{row.label}</p>
      <p className="mt-4 text-[34px] font-semibold leading-none tracking-tight tabular-nums md:text-[40px]" style={{ color: MANAGER_COLORS.dark }}>{row.value}</p>
      <p className="mt-3 text-xs" style={{ color: MANAGER_COLORS.support }}>{row.note}</p>
    </ManagerCard>
  );
}
const HIGHLIGHT_TONES = ["primary", "neutral", "primary"];

/* ── Delta chip ──────────────────────────────────────── */
function DeltaChip({ value }) {
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const color = dir === "up" ? MANAGER_STATUS.safe.fg : dir === "down" ? MANAGER_STATUS.breached.fg : MANAGER_COLORS.muted;
  const bg = dir === "up" ? MANAGER_STATUS.safe.bg : dir === "down" ? MANAGER_STATUS.breached.bg : MANAGER_CHROME.pillTray;
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "—";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums" style={{ color, backgroundColor: bg }}>
      <span className="text-[8px]">{arrow}</span>
      {Math.abs(value)}%
    </span>
  );
}

/* ── SLA bar (small) ─────────────────────────────────── */
function SlaBar({ pct }) {
  const fill = pct >= 90 ? MANAGER_STATUS.safe.fg : pct >= 80 ? MANAGER_STATUS.atRisk.fg : MANAGER_STATUS.breached.fg;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ backgroundColor: MANAGER_CHROME.trackBg }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: fill }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{pct}%</span>
    </div>
  );
}

/* ── View ─────────────────────────────────────────────── */
export default function ManagerReportsView() {
  const { t, i18n } = useTranslation("manager");
  const [range, setRange] = useState(DEFAULT_MANAGER_REPORT_RANGE);
  const rangeLabel = useMemo(
    () => translateReportRangeId(range, t),
    [range, t],
  );

  const reportRangeOptions = useMemo(
    () => MANAGER_REPORT_RANGES.map((r) => ({ id: r.id, label: translateReportRangeId(r.id, t) })),
    [t],
  );

  const isCustom = range === "custom";
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const defaultFrom = fmt(new Date(today.getTime() - 29 * 86400000));
  const defaultTo = fmt(today);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  //const [exportLoading, setExportLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── API verisi (Faz 1 — no mock while loading) ───────────
  const {
    volume,
    products,
    agents,
    resolutionTrend,
    highlights,
    loading,
    reportsReady,
    usingMockFallback,
    isPeriodEmpty,
    refetch,
  } = useManagerReportsData({ range, customFrom: from, customTo: to });

  const sortedAgents = useMemo(
    () => (Array.isArray(agents) ? [...agents].sort((a, b) => b.resolved - a.resolved) : []),
    [agents],
  );

  const translatedHighlights = useMemo(
    () => (highlights ?? []).map((row) => translateReportHighlightRow(row, t, i18n.language)),
    [highlights, t, i18n.language],
  );

  const { startDate: exportStart, endDate: exportEnd } = useMemo(
    () => getReportDateRange(range, from, to),
    [range, from, to],
  );

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await exportReportCsv(exportStart, exportEnd);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `destrova_report_${exportStart}_to_${exportEnd}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ManagerSurface
      eyebrow={t("reports.eyebrow")}
      title={t("reports.title")}
      description={
        loading
          ? t("reports.descriptionLoading")
          : usingMockFallback
            ? t("reports.descriptionMock")
            : t("reports.description")
      }
      actions={
        <button
          type="button"
          onClick={handleExportCsv}
          className={`${SAAS_BUTTON.primaryMd} disabled:opacity-70`}
          disabled={exporting || loading || usingMockFallback}
        >
          <IconDownload className="h-4 w-4" />
          {exporting ? t("reports.exporting") : t("reports.export")}
        </button>
      }
    >
      <ManagerCard padding="p-4 md:p-5" tone="muted" topAccent={false}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-800"
            >
              <IconCalendar className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>
                {t("reports.window")}
              </p>
              <p className="mt-0.5 text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>
                {rangeLabel}{isCustom ? ` · ${from} → ${to}` : ""}
                {loading ? <span className="ml-2 text-[11px] font-normal" style={{ color: MANAGER_COLORS.muted }}>{t("reports.loadingShort")}</span> : null}
              </p>
            </div>
          </div>
          <ManagerPillGroup
            ariaLabel={t("reports.dateRangeAria")}
            value={range}
            onChange={setRange}
            options={reportRangeOptions}
            size="sm"
          />
        </div>

        {isCustom ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-md">
            <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
              <span className="font-semibold uppercase tracking-[0.14em]">{t("reports.from")}</span>
              <input
                type="date" value={from} max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
                style={{ color: MANAGER_COLORS.dark, boxShadow: MANAGER_CHROME.inputInset }}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
              <span className="font-semibold uppercase tracking-[0.14em]">{t("reports.to")}</span>
              <input
                type="date" value={to} min={from}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(37,99,235,0.22)]"
                style={{ color: MANAGER_COLORS.dark, boxShadow: MANAGER_CHROME.inputInset }}
              />
            </label>
          </div>
        ) : null}
      </ManagerCard>

      {!reportsReady ? (
        <ReportsContentSkeleton />
      ) : (
        <>
      {usingMockFallback ? <ReportsMockFallbackBanner onRetry={refetch} /> : null}

      {isPeriodEmpty && !usingMockFallback ? (
        <div
          className="rounded-lg border border-slate-200/90 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
          role="status"
        >
          {t("reports.periodEmpty", { range: rangeLabel })}
        </div>
      ) : null}

      {/* Volume + highlights */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ManagerCard className="lg:col-span-8" padding="p-6 md:p-7" tone="neutral" elevated>
          <ManagerCardHeader
            title={t("reports.volume.title")}
            hint={t("reports.volume.hint", { range: rangeLabel })}
            action={
              <div className="flex items-center gap-3 text-xs" style={{ color: MANAGER_COLORS.muted }}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: REPORT_CHART.created }} /> {t("reports.volume.created")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: REPORT_CHART.resolvedLine }} /> {t("reports.volume.resolved")}
                </span>
              </div>
            }
          />
          <div className="mt-5 grid grid-cols-2 gap-4 sm:max-w-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>{t("reports.volume.created")}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: REPORT_CHART.created }}>{volume.created}</p>
              {volume.deltaCreated?.text ? (
                <p className="mt-1 text-[11px]" style={{ color: MANAGER_COLORS.support }}>{translateReportVolumeDelta(volume.deltaCreated.text, t)}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>{t("reports.volume.resolved")}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: MANAGER_COLORS.support }}>{volume.resolved}</p>
              {volume.deltaResolved?.text ? (
                <p className="mt-1 text-[11px]" style={{ color: MANAGER_COLORS.support }}>{translateReportVolumeDelta(volume.deltaResolved.text, t)}</p>
              ) : null}
            </div>
          </div>
          <VolumeChart series={volume.series} />
        </ManagerCard>

        <div className="grid gap-4 lg:col-span-4">
          {translatedHighlights.map((row, i) => (
            <HighlightCard key={row.label} row={row} tone={HIGHLIGHT_TONES[i % HIGHLIGHT_TONES.length]} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ManagerCard className="lg:col-span-8 border border-gray-200 bg-white" padding="p-6 md:p-7" tone="default" elevated>
          <ManagerCardHeader title={t("reports.products.title")} hint={t("reports.products.hint", { range: rangeLabel })} />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                  <th className="pb-3 pr-4 font-semibold">{t("reports.products.columns.product")}</th>
                  <th className="pb-3 pr-4 font-semibold text-right">{t("reports.products.columns.tickets")}</th>
                  <th className="pb-3 pr-4 font-semibold text-right">{t("reports.products.columns.avgResolution")}</th>
                  <th className="pb-3 pr-4 font-semibold">{t("reports.products.columns.slaMet")}</th>
                  <th className="pb-3 font-semibold text-right">{t("reports.products.columns.vsPrev")}</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-2">
                      <ReportsEmptyState
                        title={t("reports.products.emptyTitle")}
                        description={t("reports.products.emptyDesc")}
                      />
                    </td>
                  </tr>
                ) : products.map((p) => (
                  <tr key={p.name} className="transition-colors duration-150 hover:bg-slate-50">
                    <td className="py-3 pr-4 align-middle text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{p.name}</td>
                    <td className="py-3 pr-4 align-middle text-right text-sm tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{p.tickets}</td>
                    <td className="py-3 pr-4 align-middle text-right text-sm tabular-nums" style={{ color: MANAGER_COLORS.support }}>{formatReportDurationValue(p.avgResolution, i18n.language)}</td>
                    <td className="py-3 pr-4 align-middle"><SlaBar pct={p.slaMet} /></td>
                    <td className="py-3 align-middle text-right"><DeltaChip value={p.deltaPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ManagerCard>

        <ManagerCard className="lg:col-span-4" padding="p-6 md:p-7" tone="default" elevated>
          <ManagerCardHeader title={t("reports.resolutionTrend.title")} hint={t("reports.resolutionTrend.hint")} />
          <TrendSparkline data={resolutionTrend} />
        </ManagerCard>
      </section>

      <ManagerCard padding="p-6 md:p-7" tone="default" elevated className="border border-gray-200 bg-white">
        <ManagerCardHeader title={t("reports.agents.title")} hint={t("reports.agents.hint", { range: rangeLabel })} />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                <th className="pb-3 pr-4 font-semibold">{t("reports.agents.columns.agent")}</th>
                <th className="pb-3 pr-4 font-semibold text-right">{t("reports.agents.columns.resolved")}</th>
                <th className="pb-3 pr-4 font-semibold text-right">{t("reports.agents.columns.avgResolution")}</th>
                <th className="pb-3 pr-4 font-semibold">{t("reports.agents.columns.slaMet")}</th>
                <th className="pb-3 font-semibold text-right">{t("reports.agents.columns.csat")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-2">
                    <ReportsEmptyState
                      title={t("reports.agents.emptyTitle")}
                      description={t("reports.agents.emptyDesc")}
                    />
                  </td>
                </tr>
              ) : sortedAgents.map((a) => (
                <tr key={a.name} className="transition-colors duration-150 hover:bg-slate-50">
                  <td className="py-3 pr-4 align-middle">
                    <p className="text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{a.name}</p>
                    <p className="text-[11px]" style={{ color: MANAGER_COLORS.muted }}>{translateReportAgentRole(a.role, t)}</p>
                  </td>
                  <td className="py-3 pr-4 align-middle text-right text-sm tabular-nums font-semibold" style={{ color: MANAGER_COLORS.dark }}>{a.resolved}</td>
                  <td className="py-3 pr-4 align-middle text-right text-sm tabular-nums" style={{ color: MANAGER_COLORS.support }}>{formatReportDurationValue(a.avgResolution, i18n.language)}</td>
                  <td className="py-3 pr-4 align-middle"><SlaBar pct={a.slaMet} /></td>
                  <td className="py-3 align-middle text-right">
                    {a.csat != null ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>
                        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                          <path d="M6 1l1.5 3.2 3.5.4-2.6 2.4.7 3.5L6 8.9 2.9 10.5l.7-3.5L1 4.6l3.5-.4L6 1z" fill={MANAGER_STATUS.atRisk.fg} />
                        </svg>
                        {a.csat.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: MANAGER_COLORS.muted }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ManagerCard>
        </>
      )}
    </ManagerSurface>
  );
}
