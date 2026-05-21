/**
 * UI-only labels; backend `status` values stay unchanged.
 * TODO: replace localStorage “seen at” / update heuristics with a backend read-receipt or
 * per-activity notification API so “new updates” ignores internal agent-only changes.
 */
export const CUSTOMER_STATUS_LABELS = {
  NEW: "Request received",
  IN_PROGRESS: "In review",
  WAITING_FOR_CUSTOMER: "Awaiting your response",
  RESOLVED: "Solution provided",
  CLOSED: "Closed",
};

export function getCustomerStatusLabel(status) {
  if (status && CUSTOMER_STATUS_LABELS[status]) {
    return CUSTOMER_STATUS_LABELS[status];
  }
  return "Active request";
}

/** Tailwind classes for customer-facing status pills (calm, not agent-console). */
export function getCustomerStatusBadgeClass(status) {
  switch (status) {
    case "NEW":
      return "bg-sky-50/90 text-sky-900 ring-1 ring-inset ring-sky-200/70";
    case "IN_PROGRESS":
      return "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200/70";
    case "WAITING_FOR_CUSTOMER":
      return "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200/80";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/70";
    case "CLOSED":
      return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/80";
    default:
      return "bg-slate-100/90 text-slate-700 ring-1 ring-inset ring-slate-200/80";
  }
}

/** Accent color (solid hex) for status — used for dots, progress markers, left-edge accents. */
export function getCustomerStatusAccent(status) {
  switch (status) {
    case "NEW":
      return "#0284C7";        // sky-600
    case "IN_PROGRESS":
      return "#7C3AED";        // violet-600
    case "WAITING_FOR_CUSTOMER":
      return "#D97706";        // amber-600
    case "RESOLVED":
      return "#059669";        // emerald-600
    case "CLOSED":
      return "#64748B";        // slate-500
    default:
      return "#64748B";
  }
}

/** Tailwind dot bg + ring classes (useful where hex string is impractical). */
export function getCustomerStatusDotClass(status) {
  switch (status) {
    case "NEW":
      return "bg-sky-500 ring-sky-100";
    case "IN_PROGRESS":
      return "bg-violet-500 ring-violet-100";
    case "WAITING_FOR_CUSTOMER":
      return "bg-amber-500 ring-amber-100";
    case "RESOLVED":
      return "bg-emerald-500 ring-emerald-100";
    case "CLOSED":
      return "bg-slate-400 ring-slate-100";
    default:
      return "bg-slate-400 ring-slate-100";
  }
}

/**
 * "Our team has done something" for the list row — not a generic timestamp delta.
 * NEW-only tickets are not "updates from our team" until the workflow moves.
 */
export function ticketHasFollowUpActivity(ticket) {
  const s = ticket?.status;
  if (s == null) return false;
  if (s !== "NEW") return true;
  return false;
}

/**
 * "New update" for list/banner: team has touched the ticket after the user last
 * recorded a view (`seen` = ISO timestamp of last seen `updatedAt` snapshot).
 */
export function hasUnseenTeamUpdate(ticket, seenUpdatedAtByTicket) {
  if (!ticketHasFollowUpActivity(ticket)) return false;
  const map = seenUpdatedAtByTicket || {};
  const seen = map[String(ticket.id)];
  const latest = ticket.updatedAt || ticket.createdAt;
  if (seen == null || String(seen).trim() === "") return true;
  const u = new Date(latest).getTime();
  const s = new Date(seen).getTime();
  if (Number.isNaN(u) || Number.isNaN(s)) return true;
  return u > s;
}

/** 0–100 progress hint for customer "next steps" rail. Intentionally coarse. */
export function getCustomerProgressPercent(status) {
  switch (status) {
    case "NEW":
      return 15;
    case "IN_PROGRESS":
      return 55;
    case "WAITING_FOR_CUSTOMER":
      return 70;
    case "RESOLVED":
      return 92;
    case "CLOSED":
      return 100;
    default:
      return 10;
  }
}
