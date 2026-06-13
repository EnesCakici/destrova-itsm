/**
 * Destrova — shared enterprise SaaS platform tokens (all roles).
 * Single source of truth for hex values; role token files re-export from here in later steps.
 * Do not add new palette hex outside this module.
 */

/** Brand, surfaces, borders, text scale */
export const SAAS_COLORS = {
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  canvas: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  border: "#E5E7EB",
  borderSubtle: "#F3F4F6",
  hover: "#F1F5F9",
  sidebarHover: "#EFF6FF",
  textPrimary: "#111827",
  textSecondary: "#374151",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
};

/** Semantic status colors — resolved, at risk, critical, info */
export const SAAS_SEMANTIC = {
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#2563EB",
};

/** SLA / workflow indicator pills (foreground + tinted background) */
export const SAAS_STATUS = {
  safe: { fg: "#22C55E", bg: "rgba(34,197,94,0.10)" },
  atRisk: { fg: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  breached: { fg: "#EF4444", bg: "rgba(239,68,68,0.10)" },
  paused: { fg: "#6B7280", bg: "rgba(107,114,128,0.10)" },
};

export const SAAS_SHADOW = {
  card: "0 1px 2px rgba(0,0,0,0.05)",
  cardHover: "0 8px 24px rgba(15,23,42,0.08)",
  elevated: "0 4px 12px rgba(15,23,42,0.05)",
};

export const SAAS_RADIUS = {
  button: "10px",
  card: "14px",
  badge: "9999px",
};

/** Portal canvas — same family, different role feel */
export const SAAS_PORTAL_CANVAS = {
  customer: "#FFFFFF",
  manager: "#FFFFFF",
  agent: "#F1F5F9",
};

/**
 * Enterprise filled/outline CTAs — soft blue elevation, no dark edge (avoid shadow-sm + harsh outline).
 * Use across roles for consistent primary actions.
 */
const SAAS_BTN_PRIMARY_CORE =
  "appearance-none [-webkit-appearance:none] border-0 font-semibold text-white outline-none transition-[background-color,box-shadow] duration-150 " +
  "bg-[#2563EB] shadow-[0_1px_2px_rgba(37,99,235,0.32)] " +
  "hover:bg-[#1D4ED8] hover:shadow-[0_2px_6px_rgba(37,99,235,0.26)] " +
  "focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
  "active:bg-[#1E40AF] active:shadow-[0_1px_2px_rgba(37,99,235,0.28)] " +
  "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none";

/** Icon-only actions (download, dismiss) — no native OS button chrome. */
export const SAAS_ICON_BUTTON =
  "appearance-none [-webkit-appearance:none] inline-flex items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none " +
  "transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-500/25 focus-visible:ring-offset-2";

export const SAAS_BUTTON = {
  primary:
    `inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm ${SAAS_BTN_PRIMARY_CORE}`,
  primarySm:
    `inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${SAAS_BTN_PRIMARY_CORE}`,
  primaryMd:
    `inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm ${SAAS_BTN_PRIMARY_CORE}`,
  secondary:
    "appearance-none [-webkit-appearance:none] inline-flex items-center justify-center gap-2 rounded-[10px] border border-slate-200/90 bg-white px-4 py-2 text-sm font-medium text-slate-700 " +
    "shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,background-color,box-shadow] duration-150 " +
    "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_1px_3px_rgba(15,23,42,0.06)] " +
    "focus-visible:ring-2 focus-visible:ring-slate-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
    "disabled:pointer-events-none disabled:opacity-50",
  secondarySm:
    "appearance-none [-webkit-appearance:none] inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 " +
    "shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,background-color] duration-150 " +
    "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 " +
    "focus-visible:ring-2 focus-visible:ring-slate-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
    "disabled:pointer-events-none disabled:opacity-50",
};

const SAAS_STATUS_KEYS = new Set(Object.keys(SAAS_STATUS));

/**
 * Inline pill/chip styles for SLA state kinds.
 * @param {keyof typeof SAAS_STATUS | string} kind
 * @returns {{ color: string, backgroundColor: string }}
 */
export function getSaasStatusStyle(kind) {
  const key = SAAS_STATUS_KEYS.has(kind) ? kind : "paused";
  const { fg, bg } = SAAS_STATUS[key];
  return { color: fg, backgroundColor: bg };
}

const PRIORITY_KIND_MAP = {
  HIGH: "breached",
  HIGH_PRIORITY: "breached",
  CRITICAL: "breached",
  MEDIUM: "atRisk",
  MEDIUM_PRIORITY: "atRisk",
  LOW: "paused",
  LOW_PRIORITY: "paused",
};

/**
 * Maps ticket priority codes to SAAS_STATUS styling (high → danger tone).
 * @param {string} level — e.g. HIGH, MEDIUM, LOW or display "High"
 * @returns {{ color: string, backgroundColor: string, kind: string }}
 */
export function getSaasPriorityStyle(level) {
  const normalized = String(level ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const displayMap = { HIGH: "breached", MEDIUM: "atRisk", LOW: "paused" };
  const kind =
    PRIORITY_KIND_MAP[normalized] ||
    displayMap[normalized] ||
    "paused";
  return { ...getSaasStatusStyle(kind), kind };
}
