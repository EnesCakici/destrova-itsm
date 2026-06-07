/**
 * Destrova manager — strict palette.
 * Visual source: saasPlatformTokens — keep export names stable for manager views.
 * Reused across all manager views; NEVER introduce ad-hoc colors here.
 */
import {
  SAAS_BUTTON,
  SAAS_COLORS,
  SAAS_RADIUS,
  SAAS_SEMANTIC,
  SAAS_SHADOW,
  SAAS_STATUS,
} from "../shared/saasPlatformTokens.js";

export { SAAS_BUTTON };

export const MANAGER_COLORS = {
  ink: SAAS_COLORS.textSecondary,
  support: SAAS_COLORS.textMuted,
  muted: SAAS_COLORS.textFaint,
  dark: SAAS_COLORS.textPrimary,
  surface: SAAS_COLORS.surface,
  canvas: SAAS_COLORS.canvas,
  hairline: "rgba(15,23,42,0.06)",
  primary: SAAS_COLORS.primary,
};

/** Reserved status accents — used ONLY on indicators, never on layout. */
export const MANAGER_STATUS = {
  safe: { fg: SAAS_SEMANTIC.success, bg: SAAS_STATUS.safe.bg },
  atRisk: { fg: SAAS_SEMANTIC.warning, bg: SAAS_STATUS.atRisk.bg },
  breached: { fg: SAAS_SEMANTIC.danger, bg: SAAS_STATUS.breached.bg },
  paused: { fg: SAAS_STATUS.paused.fg, bg: SAAS_STATUS.paused.bg },
};

/**
 * Surface tones — drive the depth-and-hierarchy system.
 * Each tone returns the *background gradient* a card uses.
 *
 * Rules of use:
 *   default  → soft white card (subtle off-white gradient)
 *   primary  → KPI / focus surfaces with blue edge tint
 *   accent   → important sections (critical tickets, breach lists)
 *   neutral  → calm gray panels (charts, neutral lists)
 *   muted    → backdrop panels (filter trays, secondary surfaces)
 */
export const MANAGER_TONES = {
  default: {
    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
    hover: "linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)",
    edge: "rgba(15,23,42,0.06)",
  },
  primary: {
    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
    hover: "linear-gradient(180deg, #FFFFFF 0%, #EFF6FF 100%)",
    edge: "rgba(37,99,235,0.12)",
  },
  accent: {
    background:
      "linear-gradient(180deg, rgba(37,99,235,0.04) 0%, rgba(37,99,235,0.01) 50%, #FFFFFF 100%)",
    hover:
      "linear-gradient(180deg, rgba(37,99,235,0.06) 0%, rgba(37,99,235,0.02) 50%, #FFFFFF 100%)",
    edge: "rgba(37,99,235,0.14)",
  },
  neutral: {
    background:
      "linear-gradient(180deg, rgba(148,163,184,0.06) 0%, rgba(148,163,184,0.02) 60%, #FFFFFF 100%)",
    hover:
      "linear-gradient(180deg, rgba(148,163,184,0.08) 0%, rgba(148,163,184,0.03) 60%, #FFFFFF 100%)",
    edge: "rgba(100,116,139,0.08)",
  },
  muted: {
    background:
      "linear-gradient(180deg, rgba(15,23,42,0.03) 0%, rgba(15,23,42,0.01) 100%)",
    hover:
      "linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.015) 100%)",
    edge: "rgba(15,23,42,0.06)",
  },
};

/**
 * Status-toned card backgrounds — only for high-signal cards (e.g. SLA breached metric).
 * Stay restrained: never fully saturated, always end into white.
 */
export const MANAGER_STATUS_TONES = {
  safe:
    "linear-gradient(180deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.025) 55%, #FFFFFF 100%)",
  atRisk:
    "linear-gradient(180deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.025) 55%, #FFFFFF 100%)",
  breached:
    "linear-gradient(180deg, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.025) 55%, #FFFFFF 100%)",
  paused:
    "linear-gradient(180deg, rgba(107,114,128,0.08) 0%, rgba(107,114,128,0.02) 55%, #FFFFFF 100%)",
};

/**
 * Decorative gradient lines applied to the top of cards/sections.
 * Length is `100%`, height is 1–2px. They visually anchor the card
 * without acting like a thick border.
 */
export const MANAGER_ACCENT_LINES = {
  default:
    "linear-gradient(90deg, rgba(15,23,42,0) 0%, rgba(100,116,139,0.22) 50%, rgba(15,23,42,0) 100%)",
  primary:
    "linear-gradient(90deg, rgba(37,99,235,0) 0%, rgba(37,99,235,0.35) 50%, rgba(37,99,235,0) 100%)",
  accent:
    "linear-gradient(90deg, rgba(37,99,235,0) 0%, rgba(29,78,216,0.30) 50%, rgba(37,99,235,0) 100%)",
  safe:
    "linear-gradient(90deg, rgba(34,197,94,0) 0%, rgba(34,197,94,0.45) 50%, rgba(34,197,94,0) 100%)",
  atRisk:
    "linear-gradient(90deg, rgba(245,158,11,0) 0%, rgba(245,158,11,0.45) 50%, rgba(245,158,11,0) 100%)",
  breached:
    "linear-gradient(90deg, rgba(239,68,68,0) 0%, rgba(239,68,68,0.55) 50%, rgba(239,68,68,0) 100%)",
};

/**
 * Canvas decoration: optional subtle slate wash (no purple radial).
 * Stack as `backgroundImage` on top of `MANAGER_COLORS.canvas`.
 */
export const MANAGER_CANVAS_GLOW =
  "radial-gradient(60rem 36rem at 8% -8%, rgba(15,23,42,0.02), transparent 60%)," +
  " radial-gradient(50rem 28rem at 100% 0%, rgba(15,23,42,0.015), transparent 60%)";

/**
 * Shadows — slate-based (SAAS); keys unchanged for manager primitives.
 */
export const MANAGER_SHADOWS = {
  surface:
    "0 1px 0 rgba(255,255,255,0.6) inset, " + SAAS_SHADOW.card,
  elevated:
    "0 1px 0 rgba(255,255,255,0.7) inset, " + SAAS_SHADOW.elevated,
  kpi:
    "0 1px 0 rgba(255,255,255,0.7) inset, " +
    SAAS_SHADOW.card +
    ", 0 12px 32px -24px rgba(15,23,42,0.08)",
  hover:
    "0 1px 0 rgba(255,255,255,0.7) inset, " + SAAS_SHADOW.cardHover,
  inset:
    "0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(15,23,42,0.04) inset",
};

/** SAAS radius aliases for manager components migrating off arbitrary px */
export const MANAGER_RADIUS = {
  button: SAAS_RADIUS.button,
  card: SAAS_RADIUS.card,
  badge: SAAS_RADIUS.badge,
};

/** Page hero — blue brand banner (matches customer CUSTOMER_PAGE.heroBanner). */
export const MANAGER_PAGE = {
  heroBanner:
    "relative overflow-hidden rounded-[14px] bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#1D4ED8] px-6 py-7 shadow-[0_4px_24px_rgba(30,58,138,0.2)] md:px-8 md:py-8",
  heroRow:
    "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
  heroBannerEyebrow:
    "text-[10.5px] font-semibold uppercase tracking-[0.18em] text-blue-100",
  heroBannerTitle:
    "mt-2.5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-[36px]",
  heroBannerDesc:
    "mt-2 max-w-2xl text-[13.5px] leading-relaxed text-blue-50",
  heroBannerAction:
    "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-semibold tracking-tight text-blue-50 backdrop-blur-sm",
  heroBannerButton:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white px-4 py-2.5 text-sm font-semibold tracking-tight text-blue-700 shadow-sm outline-none transition-colors hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 disabled:pointer-events-none disabled:opacity-70",
  heroBannerButtonMd:
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white px-5 py-2.5 text-sm font-semibold tracking-tight text-blue-700 shadow-sm outline-none transition-colors hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 disabled:pointer-events-none disabled:opacity-70",
  /** Ops / list / detail pages — thin slate strip (not marketing hero) */
  pageHeaderStrip:
    "overflow-hidden rounded-[12px] border border-slate-200/90 bg-gradient-to-r from-white via-slate-50/50 to-white shadow-sm ring-1 ring-inset ring-slate-100/70",
  pageHeaderStripSpaced: "mb-6 md:mb-8",
  pageHeaderStripInner:
    "flex flex-col gap-4 px-5 py-4 md:flex-row md:items-end md:justify-between md:px-6 md:py-[1.125rem]",
  pageHeaderEyebrow:
    "text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500",
  pageHeaderAccent: "inline-block h-[3px] w-8 shrink-0 rounded-full bg-blue-600",
  pageHeaderTitle:
    "mt-2 text-[1.375rem] font-semibold leading-tight tracking-tight text-slate-900 md:text-[1.65rem]",
  pageHeaderDesc: "mt-1.5 max-w-2xl text-[13px] leading-relaxed text-slate-500",
  /** All Tickets list — customer My Tickets visual language on manager canvas */
  ticketTableFrame:
    "overflow-hidden rounded-[14px] border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-inset ring-slate-100/80",
  listFilterTray:
    "flex w-full min-w-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-slate-50/80 p-1.5",
  listFilterControl:
    "h-9 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-600 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-[border-color,box-shadow,background-color] duration-150 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600/20",
  listFilterClearBtn:
    "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[12.5px] font-medium transition-colors duration-150",
};

/** Reset native button chrome (Tailwind preflight is off in this app). */
export const MANAGER_GHOST_BUTTON =
  "appearance-none border-0 bg-transparent shadow-none outline-none " +
  "focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2";

/** List panels without browser bullets / default margins */
export const MANAGER_SHELL_LIST = "m-0 list-none p-0";

/** Shared chrome for inputs, trays, chart tracks (slate — not legacy purple). */
export const MANAGER_CHROME = {
  trackBg: "rgba(15,23,42,0.08)",
  hairlineInset: "0 0 0 1px rgba(15,23,42,0.06) inset",
  inputInset: "0 0 0 1px rgba(15,23,42,0.08) inset",
  focusRing: "0 0 0 2px rgba(37,99,235,0.22)",
  pillTray: "rgba(15,23,42,0.05)",
  pillActiveShadow: "0 1px 2px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.08)",
  hoverSubtle: "rgba(15,23,42,0.04)",
  hoverRow: "rgba(15,23,42,0.05)",
  chartGrid: "rgba(15,23,42,0.045)",
};
