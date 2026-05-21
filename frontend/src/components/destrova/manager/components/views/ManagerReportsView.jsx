import { useEffect, useMemo, useRef, useState } from "react";
import { useManagerReportsData } from "../../hooks/useManagerReportsData";
import { MANAGER_REPORT_EXPORT_FORMATS, MANAGER_REPORT_RANGES } from "../../data/managerMock";
import { MANAGER_COLORS, MANAGER_STATUS } from "../../managerTokens";
import ManagerCard, { ManagerCardHeader } from "../ManagerCard";
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

function IconChevron({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Date range selector ──────────────────────────────── */
function DateRangePills({ value, onChange }) {
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
      {MANAGER_REPORT_RANGES.map((r) => {
        const active = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className="relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-[background-color,color,box-shadow] duration-150"
            style={{
              color: active ? MANAGER_COLORS.dark : MANAGER_COLORS.support,
              backgroundColor: active ? "#FFFFFF" : "transparent",
              boxShadow: active ? "0 1px 2px rgba(15,14,71,0.08), 0 0 0 1px rgba(39,39,87,0.08)" : "none",
            }}
            aria-pressed={active}
          >
            {r.id === "custom" ? <IconCalendar className="h-3.5 w-3.5" /> : null}
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Export dropdown ──────────────────────────────────── */
function ExportButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-[background-color,box-shadow] duration-150"
        style={{
          color: MANAGER_COLORS.surface,
          backgroundColor: MANAGER_COLORS.dark,
          boxShadow: "0 8px 18px -10px rgba(15,14,71,0.55), 0 1px 0 rgba(255,255,255,0.18) inset",
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <IconDownload className="h-4 w-4" />
        Export
        <IconChevron className="h-3.5 w-3.5 opacity-80" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl"
          style={{
            backgroundColor: MANAGER_COLORS.surface,
            backgroundImage: "linear-gradient(180deg, #FFFFFF 0%, #FAFBFE 100%)",
            boxShadow: "0 18px 50px -22px rgba(15,14,71,0.35), 0 0 0 1px rgba(39,39,87,0.08)",
          }}
        >
          {MANAGER_REPORT_EXPORT_FORMATS.map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-[rgba(39,39,87,0.04)]"
              style={{ color: MANAGER_COLORS.dark }}
              role="menuitem"
            >
              <span>Export as {fmt}</span>
              <IconDownload className="h-3.5 w-3.5 opacity-60" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── Volume chart (created vs resolved over the period) ── */
/* ── Volume chart (reports) – tooltip + overflow visible ── */
function VolumeChart({ series }) {
  const [hoverI, setHoverI] = useState(null);
  const W = 720;
  const H = 240; // biraz yükseltildi
  const PAD_X = 24;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 44; // tarih etiketleri için daha fazla alan

  const max = Math.max(
    ...series.flatMap((d) => [d.created, d.resolved]),
    1
  ) * 1.15;

  const n = series.length;
  const stepX = (W - PAD_X * 2) / Math.max(n - 1, 1);
  const xFor = (i) => PAD_X + i * stepX;
  const yFor = (v) => H - PAD_BOTTOM - (v / max) * (H - PAD_TOP - PAD_BOTTOM);

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
      stroke="rgba(39,39,87,0.06)"
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
      label: d.week,
      created: d.created ?? 0,
      resolved: d.resolved ?? 0,
    };
  }, [hoverI, series]);

  const tipLeftPct =
    hoverI != null ? Math.max(8, Math.min(92, (xFor(hoverI) / W) * 100)) : 50;

  return (
    <div className="relative mt-6 overflow-visible">
      <div className="overflow-visible">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Created vs resolved over time"
        >
          <defs>
            <linearGradient id="mgr-rep-vol-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#272757" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#272757" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="mgr-rep-res-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(31,122,92,0.11)" />
              <stop offset="100%" stopColor="rgba(31,122,92,0)" />
            </linearGradient>
          </defs>

          {gridLines}

          {/* Temel çizgi */}
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={H - PAD_BOTTOM}
            y2={H - PAD_BOTTOM}
            stroke="rgba(39,39,87,0.08)"
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
            stroke="rgba(31,122,92,0.8)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={buildPath("created")}
            fill="none"
            stroke={MANAGER_COLORS.dark}
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
                stroke="rgba(31,122,92,0.8)"
                strokeWidth="1.2"
              />
              <circle
                cx={xFor(i)}
                cy={yFor(d.created ?? 0)}
                r="3.5"
                fill={MANAGER_COLORS.dark}
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
              stroke="rgba(39,39,87,0.15)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}

          {/* X ekseni etiketleri – daha küçük font, bol alt boşluk */}
          {series.map((d, i) => (
            <text
              key={`x-${i}`}
              x={xFor(i)}
              y={H - 8}
              fontSize="10"
              textAnchor="middle"
              fill={MANAGER_COLORS.muted}
              style={{ fontFamily: "inherit", whiteSpace: "nowrap" }}
            >
              {d.week}
            </text>
          ))}

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

      {/* Tooltip – dashboard’takinin aynısı */}
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-20 min-w-[9rem] rounded-md border border-[rgba(39,39,87,0.1)] bg-white px-2.5 py-2 shadow-lg"
          style={{
            left: `${tipLeftPct.toFixed(1)}%`,
            top: "0.5rem",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <p className="mb-1 border-b border-[rgba(39,39,87,0.06)] pb-1 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: MANAGER_COLORS.muted }}>
            {tooltip.label}
          </p>
          <div className="space-y-1 text-[11.5px]">
            <p className="flex justify-between gap-4 tabular-nums">
              <span style={{ color: MANAGER_COLORS.muted }}>Created</span>
              <span style={{ color: MANAGER_COLORS.dark }}>{tooltip.created}</span>
            </p>
            <p className="flex justify-between gap-4 tabular-nums">
              <span style={{ color: MANAGER_COLORS.muted }}>Resolved</span>
              <span style={{ color: MANAGER_COLORS.muted }}>{tooltip.resolved}</span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
/* ── Sparkline trend ──────────────────────────────────── */
function TrendSparkline({ data }) {
  const W = 360;
  const H = 120;
  const PAD = 12;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / Math.max(data.length - 1, 1);
  const xFor = (i) => PAD + i * stepX;
  const yFor = (v) => H - PAD - ((v - min) / range) * (H - PAD * 2);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d.value).toFixed(1)}`).join(" ");
  const area = `${path} L ${xFor(data.length - 1).toFixed(1)} ${H - PAD} L ${xFor(0).toFixed(1)} ${H - PAD} Z`;
  return (
    <div className="mt-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mgr-rep-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#272757" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#272757" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#mgr-rep-fill)" />
        <path d={path} fill="none" stroke={MANAGER_COLORS.dark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={d.week} cx={xFor(i)} cy={yFor(d.value)} r="2.5" fill={MANAGER_COLORS.dark} />
        ))}
      </svg>
      <div className="mt-3 flex justify-between text-[11px] tabular-nums" style={{ color: MANAGER_COLORS.muted }}>
        {data.map((d) => (
          <span key={d.week}>{d.week}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Bars for category share ─────────────────────────── */
function CategoryDistribution({ data }) {
  return (
    <ul className="mt-5 space-y-4">
      {data.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold" style={{ color: MANAGER_COLORS.dark }}>{row.label}</span>
            <span className="tabular-nums" style={{ color: MANAGER_COLORS.muted }}>{row.pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(39,39,87,0.08)" }}>
            <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: MANAGER_COLORS.dark }} />
          </div>
        </li>
      ))}
    </ul>
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
  const bg = dir === "up" ? MANAGER_STATUS.safe.bg : dir === "down" ? MANAGER_STATUS.breached.bg : "rgba(39,39,87,0.06)";
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
      <div className="h-1.5 w-24 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(39,39,87,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: fill }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{pct}%</span>
    </div>
  );
}

/* ── View ─────────────────────────────────────────────── */
export default function ManagerReportsView() {
  const defaultRange = MANAGER_REPORT_RANGES.find((r) => r.default)?.id || "30d";
  const [range, setRange] = useState(defaultRange);
  const rangeLabel = useMemo(
    () => MANAGER_REPORT_RANGES.find((r) => r.id === range)?.label || "Last 30 days",
    [range],
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

  // ── API verisi ──────────────────────────────────────────
  const { volume, products, agents, resolutionTrend, highlights, loading } =
    useManagerReportsData({ range, customFrom: from, customTo: to });

  const sortedAgents = useMemo(
    () => [...agents].sort((a, b) => b.resolved - a.resolved),
    [agents],
  );

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await exportReportCsv(from, to);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `destrova_report_${from}_to_${to}.csv`;
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
      eyebrow="Reports · Historical"
      title="Performance reports"
      description={
        loading
          ? "Loading report data…"
          : "Historical trends and breakdowns over the selected period. Use the date range to compare windows, then export the report for review."
      }
      actions={
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-[background-color,opacity] duration-150"
          style={{
            color: MANAGER_COLORS.surface,
            backgroundColor: MANAGER_COLORS.dark,
            boxShadow: "0 8px 18px -10px rgba(15,14,71,0.55), 0 1px 0 rgba(255,255,255,0.18) inset",
            opacity: exporting ? 0.7 : 1,
          }}
        >
          <IconDownload className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      }
    >
      {/* Date range strip */}
      <ManagerCard padding="p-4 md:p-5" tone="muted" topAccent={false}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ color: MANAGER_COLORS.dark, backgroundColor: MANAGER_COLORS.surface, boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset" }}
            >
              <IconCalendar className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: MANAGER_COLORS.muted }}>
                Reporting window
              </p>
              <p className="mt-0.5 text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>
                {rangeLabel}{isCustom ? ` · ${from} → ${to}` : ""}
                {loading ? <span className="ml-2 text-[11px] font-normal" style={{ color: MANAGER_COLORS.muted }}>Loading…</span> : null}
              </p>
            </div>
          </div>
          <DateRangePills value={range} onChange={setRange} />
        </div>

        {isCustom ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:max-w-md">
            <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
              <span className="font-semibold uppercase tracking-[0.14em]">From</span>
              <input
                type="date" value={from} max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border-0 bg-white px-3 py-2 text-sm font-medium outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)]"
                style={{ color: MANAGER_COLORS.dark, boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)" }}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs" style={{ color: MANAGER_COLORS.muted }}>
              <span className="font-semibold uppercase tracking-[0.14em]">To</span>
              <input
                type="date" value={to} min={from}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border-0 bg-white px-3 py-2 text-sm font-medium outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_2px_rgba(39,39,87,0.22)]"
                style={{ color: MANAGER_COLORS.dark, boxShadow: "0 0 0 1px rgba(39,39,87,0.08) inset, 0 1px 0 rgba(15,14,71,0.04)" }}
              />
            </label>
          </div>
        ) : null}
      </ManagerCard>

      {/* Volume + highlights */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ManagerCard className="lg:col-span-8" padding="p-6 md:p-7" tone="neutral" elevated>
          <ManagerCardHeader
            title="Ticket volume"
            hint={`${rangeLabel} · created vs resolved`}
            action={
              <div className="flex items-center gap-3 text-xs" style={{ color: MANAGER_COLORS.muted }}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: MANAGER_COLORS.dark }} /> Created
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: MANAGER_COLORS.muted }} /> Resolved
                </span>
              </div>
            }
          />
          <div className="mt-5 grid grid-cols-2 gap-4 sm:max-w-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>Created</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{volume.created}</p>
              {volume.deltaCreated?.text ? (
                <p className="mt-1 text-[11px]" style={{ color: MANAGER_COLORS.support }}>{volume.deltaCreated.text}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>Resolved</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{volume.resolved}</p>
              {volume.deltaResolved?.text ? (
                <p className="mt-1 text-[11px]" style={{ color: MANAGER_COLORS.support }}>{volume.deltaResolved.text}</p>
              ) : null}
            </div>
          </div>
          <VolumeChart series={volume.series} />
        </ManagerCard>

        <div className="grid gap-4 lg:col-span-4">
          {highlights.map((row, i) => (
            <HighlightCard key={row.label} row={row} tone={HIGHLIGHT_TONES[i % HIGHLIGHT_TONES.length]} />
          ))}
        </div>
      </section>

      {/* Product breakdown + resolution trend */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ManagerCard className="lg:col-span-8" padding="p-6 md:p-7" tone="primary" elevated>
          <ManagerCardHeader title="By product" hint={`${rangeLabel} · ticket volume, average resolution & SLA met`} />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                  <th className="pb-3 pr-4 font-semibold">Product</th>
                  <th className="pb-3 pr-4 font-semibold text-right">Tickets</th>
                  <th className="pb-3 pr-4 font-semibold text-right">Avg resolution</th>
                  <th className="pb-3 pr-4 font-semibold">SLA met</th>
                  <th className="pb-3 font-semibold text-right">vs prev.</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.name} className="transition-colors duration-150 hover:bg-[rgba(39,39,87,0.04)]">
                    <td className="py-3 pr-4 align-middle text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{p.name}</td>
                    <td className="py-3 pr-4 align-middle text-right text-sm tabular-nums" style={{ color: MANAGER_COLORS.dark }}>{p.tickets}</td>
                    <td className="py-3 pr-4 align-middle text-right text-sm tabular-nums" style={{ color: MANAGER_COLORS.support }}>{p.avgResolution}</td>
                    <td className="py-3 pr-4 align-middle"><SlaBar pct={p.slaMet} /></td>
                    <td className="py-3 align-middle text-right"><DeltaChip value={p.deltaPct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ManagerCard>

        <ManagerCard className="lg:col-span-4" padding="p-6 md:p-7" tone="default" elevated>
          <ManagerCardHeader title="Avg resolution time" hint="Average time from ticket creation to closure" />
          <TrendSparkline data={resolutionTrend} />
        </ManagerCard>
      </section>

      {/* Agent performance */}
      <ManagerCard padding="p-6 md:p-7" tone="accent" elevated>
        <ManagerCardHeader title="Agent performance" hint={`${rangeLabel} · resolved · avg resolution · SLA met · CSAT`} />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MANAGER_COLORS.muted }}>
                <th className="pb-3 pr-4 font-semibold">Agent</th>
                <th className="pb-3 pr-4 font-semibold text-right">Resolved</th>
                <th className="pb-3 pr-4 font-semibold text-right">Avg resolution</th>
                <th className="pb-3 pr-4 font-semibold">SLA met</th>
                <th className="pb-3 font-semibold text-right">CSAT</th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((a) => (
                <tr key={a.name} className="transition-colors duration-150 hover:bg-[rgba(39,39,87,0.04)]">
                  <td className="py-3 pr-4 align-middle">
                    <p className="text-sm font-semibold" style={{ color: MANAGER_COLORS.dark }}>{a.name}</p>
                    <p className="text-[11px]" style={{ color: MANAGER_COLORS.muted }}>{a.role}</p>
                  </td>
                  <td className="py-3 pr-4 align-middle text-right text-sm tabular-nums font-semibold" style={{ color: MANAGER_COLORS.dark }}>{a.resolved}</td>
                  <td className="py-3 pr-4 align-middle text-right text-sm tabular-nums" style={{ color: MANAGER_COLORS.support }}>{a.avgResolution}</td>
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
    </ManagerSurface>
  );
}
