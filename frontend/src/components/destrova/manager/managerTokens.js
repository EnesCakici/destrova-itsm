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
