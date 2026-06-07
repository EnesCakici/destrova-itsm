/**
 * Destrova customer portal — enterprise SaaS palette (blue primary; no mor #505081 in new UI).
 * Reuses platform hex from saasPlatformTokens; customer-only maps live here.
 */
import {
  SAAS_COLORS,
  SAAS_RADIUS,
  SAAS_SEMANTIC,
  SAAS_SHADOW,
} from "../shared/saasPlatformTokens.js";

/** Customer portal surfaces and text — mirrors destrova.customer.* in Tailwind */
export const CUSTOMER_COLORS = {
  primary: SAAS_COLORS.primary,
  primaryHover: SAAS_COLORS.primaryHover,
  canvas: SAAS_COLORS.canvas,
  surface: SAAS_COLORS.surface,
  border: SAAS_COLORS.border,
  hover: SAAS_COLORS.hover,
  textPrimary: SAAS_COLORS.textPrimary,
  textMuted: SAAS_COLORS.textMuted,
};

export const CUSTOMER_SEMANTIC = { ...SAAS_SEMANTIC };

export const CUSTOMER_SHADOW = {
  card: SAAS_SHADOW.card,
  cardHover: SAAS_SHADOW.cardHover,
};

export const CUSTOMER_RADIUS = {
  button: SAAS_RADIUS.button,
  card: SAAS_RADIUS.card,
  badge: SAAS_RADIUS.badge,
};

/** Customer shell — full white main pane (no gray canvas frame). */
export const CUSTOMER_WORKSPACE = {
  main: "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-white",
};

/**
 * Customer pages — flat layout on white (reads as app page, not form-in-a-card).
 */
export const CUSTOMER_PAGE = {
  root: "flex min-h-0 min-w-0 flex-1 flex-col bg-white",
  innerWide: "mx-auto w-full min-w-0 max-w-6xl flex-1 px-6 py-8 md:px-10 md:py-10",
  innerForm: "mx-auto w-full min-w-0 max-w-6xl flex-1 px-6 py-8 md:px-10 md:py-10",
  hero: "border-b border-gray-100 pb-10",
  heroRow:
    "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
  /** Blue brand hero — My Tickets / marketing-style page intro */
  heroBanner:
    "relative overflow-hidden rounded-[14px] bg-gradient-to-br from-[#2563EB] via-[#2563EB] to-[#1D4ED8] px-6 py-8 shadow-[0_4px_24px_rgba(37,99,235,0.22)] md:px-8 md:py-9",
  heroBannerEyebrow:
    "text-[10.5px] font-semibold uppercase tracking-[0.18em] text-blue-100",
  heroBannerTitle:
    "mt-2.5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-white md:text-[36px]",
  heroBannerDesc:
    "mt-2 max-w-xl text-[13px] leading-relaxed text-blue-50/95",
  heroBannerMetricLabel:
    "text-[11px] font-semibold leading-tight text-blue-50/90",
  heroBannerMetric:
    "inline-flex min-h-[2.75rem] min-w-0 items-center gap-2.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 backdrop-blur-sm",
  /** White hero — New request (same layout as heroBanner, light blue gradient surface) */
  heroBannerLight:
    "relative overflow-hidden rounded-[14px] border border-blue-100/90 bg-gradient-to-br from-white via-blue-50/90 to-slate-100/95 px-6 py-8 shadow-[0_4px_24px_rgba(37,99,235,0.12)] ring-1 ring-inset ring-blue-100/50 md:px-8 md:py-9",
  heroBannerLightEyebrow:
    "text-[10.5px] font-semibold uppercase tracking-[0.18em] text-blue-700",
  heroBannerLightTitle:
    "mt-2.5 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-gray-900 md:text-[36px]",
  heroBannerLightDesc:
    "mt-2 max-w-xl text-[13px] leading-relaxed text-slate-500",
  heroBannerLightChip:
    "inline-flex min-w-0 max-w-[15rem] items-start gap-2.5 rounded-lg border border-blue-100/90 bg-white/75 px-3.5 py-2.5 shadow-sm backdrop-blur-sm",
  heroBannerLightChipLabel:
    "text-[11px] font-semibold leading-snug text-gray-700",
  formSection:
    "border-t border-gray-100 py-6 first:border-t-0 first:py-0",
  formSectionTightTop:
    "border-t border-gray-100 pt-4 pb-6",
  /** New request — one bordered card per form section */
  formSectionCard:
    "overflow-hidden rounded-customer-card border border-slate-200/90 bg-white shadow-customer-card ring-1 ring-inset ring-slate-100/80",
  formSectionCardHeader:
    "border-b border-slate-200/80 bg-slate-50/90 px-5 py-4 md:px-6",
  formSectionCardBody: "space-y-3.5 px-5 py-5 md:px-6",
  sectionTitle: "text-[15px] font-semibold tracking-tight text-gray-900",
  sectionDesc: "mt-1 text-[13px] leading-relaxed text-slate-500",
  sectionBody: "mt-4 space-y-3.5",
  footer:
    "flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between",
  formFooterCard:
    "rounded-customer-card border border-slate-200/90 bg-slate-50/40 px-5 py-5 shadow-customer-card ring-1 ring-inset ring-slate-100/80 md:px-6",
  composerShell:
    "destrova-composer--flat-toolbar rounded-lg bg-white shadow-none ring-0 focus-within:ring-2 focus-within:ring-blue-600/15",
  /** My Tickets — bordered data table on flat white page */
  ticketTableFrame:
    "overflow-hidden rounded-customer-card border border-slate-200/90 bg-white shadow-customer-card ring-1 ring-inset ring-slate-100/80",
};

/** Production page wrappers — flex outlet only; no canvas/gradient (styling in child views). */
export const CUSTOMER_PAGE_WRAPPER =
  "flex min-h-0 min-w-0 flex-1 flex-col";

/** Success toast — green-500 family (#22C55E), used by CustomerTicketsPage ?created=1 */
export const CUSTOMER_TOAST = {
  success:
    "pointer-events-none fixed left-1/2 top-20 z-[100] -translate-x-1/2 rounded-xl border border-green-200/80 bg-green-50/95 px-4 py-2.5 text-sm font-medium text-green-800 shadow-lg ring-1 ring-green-100",
};

/** Text hierarchy — prefer over legacy destrova-ink* in customer JSX (Adım 11–12). */
export const CUSTOMER_TEXT = {
  label: "text-slate-500",
  body: "text-gray-900",
  muted: "text-gray-600",
};

/** Reusable chips / inline code (slate + gray-200 borders). */
export const CUSTOMER_CHIP = {
  ticketId:
    "inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11.5px] font-semibold tabular-nums text-gray-600 ring-1 ring-inset ring-gray-200",
  fileIcon:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 ring-1 ring-inset ring-gray-200",
  attachmentPill:
    "inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-semibold text-gray-700 shadow-sm transition-colors hover:bg-slate-100",
};

/** Side panels + conversation cards on ticket detail */
export const CUSTOMER_PANEL = {
  card: "overflow-hidden rounded-customer-card border border-destrova-customer-border bg-white shadow-customer-card",
  cardHover:
    "overflow-hidden rounded-customer-card border border-destrova-customer-border bg-white shadow-customer-card transition-shadow duration-150 hover:shadow-customer-card-hover",
  cardPadded: "rounded-customer-card border border-destrova-customer-border bg-white p-5 shadow-customer-card",
  header: "border-b border-gray-100 bg-slate-50/80",
  headerInner: "flex items-center justify-between gap-3 px-4 py-2.5 md:px-5",
  headerLabel: "text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500",
  divide: "divide-gray-100",
  /** Ticket detail — conversation thread scroll region (fixed height, page scrolls normally) */
  conversationScroll:
    "relative max-h-[min(60vh,36rem)] overflow-y-auto overflow-x-hidden px-4 py-4 md:px-5 md:py-4",
};

/**
 * Status pills — Tailwind classes (ring applied by components via CUSTOMER_STATUS_PILL_BASE).
 * Option A: In Progress = blue; no violet.
 */
export const CUSTOMER_STATUS = {
  NEW: "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200/90",
  IN_PROGRESS: "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200/90",
  WAITING_FOR_CUSTOMER: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200/90",
  RESOLVED: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/90",
  CLOSED: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300/80",
};

/** Solid accent hex for dots, timeline markers, progress edges */
export const CUSTOMER_STATUS_ACCENT = {
  NEW: "#2563EB",
  IN_PROGRESS: "#2563EB",
  WAITING_FOR_CUSTOMER: "#B45309",
  RESOLVED: "#16A34A",
  CLOSED: "#64748B",
};

/** Priority chips — aligned with agent semantic (high danger, medium warning, low slate). */
export const CUSTOMER_PRIORITY = {
  HIGH: "border-red-200/90 bg-red-50 text-red-800 ring-1 ring-inset ring-red-200/70",
  MEDIUM: "border-amber-200/90 bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200/70",
  LOW: "border-slate-200 bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200/80",
};

const DEFAULT_STATUS =
  "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200/90";
const DEFAULT_PRIORITY = CUSTOMER_PRIORITY.LOW;

const STATUS_ALIASES = {
  OPEN: "NEW",
};

const PRIORITY_ALIASES = {
  HIGH_PRIORITY: "HIGH",
  MEDIUM_PRIORITY: "MEDIUM",
  LOW_PRIORITY: "LOW",
  CRITICAL: "HIGH",
};

/**
 * Tailwind classes for customer status pill (badge chrome).
 * @param {string} status — API status code
 * @returns {string}
 */
export function getCustomerStatusClasses(status) {
  const raw = String(status ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!raw) return DEFAULT_STATUS;
  if (CUSTOMER_STATUS[raw]) return CUSTOMER_STATUS[raw];
  const alias = STATUS_ALIASES[raw];
  if (alias && CUSTOMER_STATUS[alias]) return CUSTOMER_STATUS[alias];
  return DEFAULT_STATUS;
}

/**
 * Tailwind classes for customer priority chip.
 * @param {string} priority — HIGH | MEDIUM | LOW
 * @returns {string}
 */
export function getCustomerPriorityClasses(priority) {
  const raw = String(priority ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!raw) return DEFAULT_PRIORITY;
  if (CUSTOMER_PRIORITY[raw]) return CUSTOMER_PRIORITY[raw];
  const alias = PRIORITY_ALIASES[raw];
  if (alias && CUSTOMER_PRIORITY[alias]) return CUSTOMER_PRIORITY[alias];
  return DEFAULT_PRIORITY;
}

/**
 * Accent hex for status indicators.
 * @param {string} status
 * @returns {string}
 */
export function getCustomerStatusAccentHex(status) {
  const raw = String(status ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  return CUSTOMER_STATUS_ACCENT[raw] || CUSTOMER_STATUS_ACCENT.NEW;
}
