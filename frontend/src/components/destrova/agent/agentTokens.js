/**
 * Destrova agent — strict palette (blue SaaS; no mor #505081 in agent UI).
 * Reuses platform hex from saasPlatformTokens; agent-only maps live here.
 */
import {
  SAAS_COLORS,
  SAAS_RADIUS,
  SAAS_SEMANTIC,
  SAAS_SHADOW,
} from "../shared/saasPlatformTokens.js";

/** Agent workspace surfaces and text — mirrors destrova.agent.* in Tailwind */
export const AGENT_COLORS = {
  primary: SAAS_COLORS.primary,
  primaryHover: SAAS_COLORS.primaryHover,
  canvas: SAAS_COLORS.canvas,
  surface: SAAS_COLORS.surface,
  border: SAAS_COLORS.border,
  hover: SAAS_COLORS.hover,
  sidebarHover: SAAS_COLORS.sidebarHover,
  textPrimary: SAAS_COLORS.textPrimary,
  textMuted: SAAS_COLORS.textMuted,
  textFaint: SAAS_COLORS.textFaint,
};

/**
 * Ticket status pills — Tailwind bg/text only (rounded-full applied by components).
 * Keys: API codes and display labels from agentTicketMappers.
 */
export const AGENT_STATUS = {
  NEW: "bg-slate-100 text-slate-700",
  New: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  "In Progress": "bg-blue-50 text-blue-700",
  WAITING_FOR_CUSTOMER: "bg-amber-50 text-amber-800",
  "Waiting for Customer": "bg-amber-50 text-amber-800",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-600",
  Closed: "bg-slate-100 text-slate-600",
};

/**
 * SLA state — progress bar track/fill, footer text, optional pill chrome.
 * Display labels: Safe, At Risk, Breached, Paused.
 */
export const AGENT_SLA = {
  Safe: {
    track: "bg-blue-100",
    fill: "bg-blue-500",
    text: "text-blue-700",
    pill: "bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
  "At Risk": {
    track: "bg-amber-100",
    fill: "bg-amber-500",
    text: "text-amber-700",
    pill: "bg-amber-50 text-amber-950",
    dot: "bg-amber-500",
  },
  Breached: {
    track: "bg-[#FEE2E2]",
    fill: "bg-[#EF4444]",
    text: "text-red-600",
    pill: "bg-red-50 text-red-800",
    dot: "bg-red-500",
  },
  Paused: {
    track: "bg-slate-100",
    fill: "bg-slate-400",
    text: "text-slate-600",
    pill: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
};

/** Priority pills — subtle semantic fills (no rose/indigo/violet). */
export const AGENT_PRIORITY = {
  HIGH: "bg-red-50 text-red-700",
  High: "bg-red-50 text-red-700",
  MEDIUM: "bg-amber-50 text-amber-800",
  Medium: "bg-amber-50 text-amber-800",
  LOW: "bg-slate-100 text-slate-600",
  Low: "bg-slate-100 text-slate-600",
};

export const AGENT_RADIUS = {
  button: SAAS_RADIUS.button,
  card: SAAS_RADIUS.card,
  badge: SAAS_RADIUS.badge,
};

export const AGENT_SHADOW = {
  card: SAAS_SHADOW.card,
  cardHover: SAAS_SHADOW.cardHover,
  eventCard: SAAS_SHADOW.card,
  eventCardElevated: SAAS_SHADOW.elevated,
};

export const AGENT_SEMANTIC = { ...SAAS_SEMANTIC };

/** Inbox / workspace layout — Tailwind class strings (Adım 2). */
export const AGENT_WORKSPACE = {
  canvas: "bg-destrova-agent-canvas",
  canvasPadding: "px-3 pt-3 pb-1 md:px-4 md:pt-4 md:pb-1.5",
  panel:
    "overflow-hidden rounded-agent-card border border-destrova-agent-border bg-white shadow-agent-card",
  placeholderWrap: "flex min-h-0 min-w-0 flex-1 bg-destrova-agent-canvas p-4 md:p-5",
  splitterBase: "relative mx-1 shrink-0 cursor-col-resize select-none rounded-full transition-all w-1.5",
  splitterIdle: "bg-transparent hover:bg-slate-300",
  splitterDragging: "bg-blue-600",
};

const DEFAULT_STATUS = AGENT_STATUS.NEW;
const DEFAULT_SLA = AGENT_SLA.Safe;
const DEFAULT_PRIORITY = AGENT_PRIORITY.LOW;

const STATUS_ALIASES = {
  OPEN: "NEW",
  "IN PROGRESS": "IN_PROGRESS",
  WAITING: "WAITING_FOR_CUSTOMER",
};

const SLA_ALIASES = {
  safe: "Safe",
  atrisk: "At Risk",
  "at risk": "At Risk",
  breached: "Breached",
  paused: "Paused",
};

const PRIORITY_ALIASES = {
  HIGH_PRIORITY: "HIGH",
  MEDIUM_PRIORITY: "MEDIUM",
  LOW_PRIORITY: "LOW",
  CRITICAL: "HIGH",
};

/**
 * Tailwind classes for a ticket status pill.
 * @param {string} key — API code or display label
 * @returns {string}
 */
export function getAgentStatusClasses(key) {
  const raw = String(key ?? "").trim();
  if (!raw) return DEFAULT_STATUS;
  if (AGENT_STATUS[raw]) return AGENT_STATUS[raw];
  const upper = raw.toUpperCase().replace(/\s+/g, "_");
  if (AGENT_STATUS[upper]) return AGENT_STATUS[upper];
  const alias = STATUS_ALIASES[upper] || STATUS_ALIASES[raw.toUpperCase()];
  if (alias && AGENT_STATUS[alias]) return AGENT_STATUS[alias];
  return DEFAULT_STATUS;
}

/**
 * SLA progress bar + related tone classes.
 * @param {string} state — Safe | At Risk | Breached | Paused
 * @returns {{ track: string, fill: string, text: string, pill: string, dot: string, width: number }}
 */
export function getAgentSlaBarClasses(state) {
  const normalized =
    SLA_ALIASES[String(state ?? "").trim().toLowerCase()] ||
    (AGENT_SLA[state] ? state : null);
  const entry = normalized && AGENT_SLA[normalized] ? AGENT_SLA[normalized] : DEFAULT_SLA;
  const widths = { Safe: 42, "At Risk": 40, Breached: 100, Paused: 35 };
  const key = normalized || "Safe";
  return { ...entry, width: widths[key] ?? 42 };
}

/**
 * Tailwind classes for priority pill.
 * @param {string} priority — HIGH | Medium | Low | display label
 * @returns {string}
 */
export function getAgentPriorityClasses(priority) {
  const raw = String(priority ?? "").trim();
  if (!raw) return DEFAULT_PRIORITY;
  if (AGENT_PRIORITY[raw]) return AGENT_PRIORITY[raw];
  const upper = raw.toUpperCase().replace(/\s+/g, "_");
  if (AGENT_PRIORITY[upper]) return AGENT_PRIORITY[upper];
  const alias = PRIORITY_ALIASES[upper];
  if (alias && AGENT_PRIORITY[alias]) return AGENT_PRIORITY[alias];
  const title = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (AGENT_PRIORITY[title]) return AGENT_PRIORITY[title];
  return DEFAULT_PRIORITY;
}
