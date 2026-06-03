/**
 * UI-only labels; backend `status` values stay unchanged.
 * TODO: replace localStorage “seen at” / update heuristics with a backend read-receipt or
 * per-activity notification API so “new updates” ignores internal agent-only changes.
 */
export const CUSTOMER_STATUS_LABELS = {
  NEW: "Request received",
  IN_PROGRESS: "Our team is reviewing",
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

/** Backend `statusLabelEn` phrases and enum tokens → workflow status key. */
const SYSTEM_STATUS_FRAGMENT_TO_KEY = {
  new: "NEW",
  "in progress": "IN_PROGRESS",
  "waiting for you": "WAITING_FOR_CUSTOMER",
  resolved: "RESOLVED",
  closed: "CLOSED",
};

function systemStatusFragmentToKey(fragment) {
  const trimmed = String(fragment || "")
    .trim()
    .replace(/[.]+$/g, "");
  if (!trimmed) return null;

  const enumish = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
  if (CUSTOMER_STATUS_LABELS[enumish]) return enumish;

  const phrase = trimmed.toLowerCase();
  if (SYSTEM_STATUS_FRAGMENT_TO_KEY[phrase]) return SYSTEM_STATUS_FRAGMENT_TO_KEY[phrase];

  return null;
}

const CUSTOMER_SYSTEM_MESSAGE_EXACT = {
  "customer approved the solution. ticket closed.": "CLOSED",
  "customer approved the resolution. ticket closed.": "CLOSED",
  "customer rejected the resolution. ticket reopened.": "IN_PROGRESS",
};

const TICKET_ASSIGNED_PATTERN = /^ticket assigned to\s+.+\.?$/i;
const TICKET_UNASSIGNED_PATTERN = /^ticket unassigned\.?$/i;
const PRIORITY_CHANGED_PATTERN = /^priority changed:\s*.+/i;
const TRANSFER_INTERNAL_PATTERN =
  /^(ticket transferred to|transfer request|transfer approved|transfer declined|transfer request declined|.+ requests transfer to|.+ \(manager\) assigned ticket to|manager @.+ notified)/i;

/** Agent-only workflow lines are not surfaced to customers. */
export function shouldHideCustomerSystemTimelineMessage(message) {
  const raw = String(message || "").trim();
  if (!raw) return true;
  if (PRIORITY_CHANGED_PATTERN.test(raw)) return true;
  if (TRANSFER_INTERNAL_PATTERN.test(raw)) return true;
  return false;
}

export function isTicketAssignmentSystemMessage(message) {
  const raw = String(message || "").trim();
  return TICKET_ASSIGNED_PATTERN.test(raw) || TICKET_UNASSIGNED_PATTERN.test(raw);
}

const TEAM_REVIEWING_LABEL = CUSTOMER_STATUS_LABELS.IN_PROGRESS;

/** Whether the customer thread already shows an “our team is reviewing” status line. */
export function customerTimelineShowsTeamReviewing(entries) {
  if (!Array.isArray(entries) || !entries.length) return false;
  return entries.some((entry) => {
    if (entry?.kind !== "SYSTEM") return false;
    const text = String(entry.displayMessage || "").trim();
    if (!text) return false;
    if (text === TEAM_REVIEWING_LABEL) return true;
    if (text.includes(`→ ${TEAM_REVIEWING_LABEL}`)) return true;
    if (isTicketAssignmentSystemMessage(entry.message)) return true;
    return false;
  });
}

/**
 * Drops duplicate “Our team is reviewing” lines when the thread already shows a later
 * status progression (e.g. → Solution provided) or the ticket is terminal.
 */
export function pruneRedundantCustomerSystemTimelineEntries(entries, ticketStatus) {
  if (!Array.isArray(entries) || !entries.length) return entries;

  const resolved = CUSTOMER_STATUS_LABELS.RESOLVED;
  const closed = CUSTOMER_STATUS_LABELS.CLOSED;
  const awaiting = CUSTOMER_STATUS_LABELS.WAITING_FOR_CUSTOMER;
  const terminal = ticketStatus === "RESOLVED" || ticketStatus === "CLOSED";

  const hasProgressionPastReviewing = entries.some((entry) => {
    if (entry?.kind !== "SYSTEM") return false;
    const text = String(entry.displayMessage || "");
    if (!text.includes("→")) return false;
    return (
      text.includes(`→ ${resolved}`) ||
      text.includes(`→ ${closed}`) ||
      text.includes(`→ ${awaiting}`) ||
      text === resolved ||
      text === closed
    );
  });

  return entries.filter((entry) => {
    if (entry?.kind !== "SYSTEM") return true;
    const label = String(entry.displayMessage || "").trim();
    const onlyReviewing =
      label === TEAM_REVIEWING_LABEL ||
      (isTicketAssignmentSystemMessage(entry.message) && label === TEAM_REVIEWING_LABEL);

    if (entry.synthetic && (terminal || hasProgressionPastReviewing)) return false;
    if (onlyReviewing && (terminal || hasProgressionPastReviewing)) return false;
    return true;
  });
}

/**
 * Maps persisted SYSTEM comment text to customer-facing timeline copy.
 * Backend stores agent-oriented strings (e.g. "Status changed: In progress → Waiting for you").
 */
export function formatCustomerSystemTimelineMessage(message) {
  const raw = String(message || "").trim();
  if (!raw) return "Update";

  if (isTicketAssignmentSystemMessage(raw)) {
    return getCustomerStatusLabel("IN_PROGRESS");
  }

  const statusChange = raw.match(/^Status changed:\s*(.+?)\s*→\s*(.+?)\.?$/i);
  if (statusChange) {
    const fromKey = systemStatusFragmentToKey(statusChange[1]);
    const toKey = systemStatusFragmentToKey(statusChange[2]);
    const toLabel = getCustomerStatusLabel(toKey);
    if (fromKey && toKey && fromKey !== toKey) {
      return `${getCustomerStatusLabel(fromKey)} → ${toLabel}`;
    }
    return toLabel;
  }

  const exactKey = CUSTOMER_SYSTEM_MESSAGE_EXACT[raw.toLowerCase()];
  if (exactKey) return getCustomerStatusLabel(exactKey);

  const loneKey = systemStatusFragmentToKey(raw);
  if (loneKey) return getCustomerStatusLabel(loneKey);

  return raw;
}

/** Target workflow status after a SYSTEM line, for timeline accent (UI only). */
export function getCustomerSystemTimelineTargetStatus(message) {
  const raw = String(message || "").trim();
  if (!raw) return null;

  if (isTicketAssignmentSystemMessage(raw)) return "IN_PROGRESS";

  const statusChange = raw.match(/^Status changed:\s*(.+?)\s*→\s*(.+?)\.?$/i);
  if (statusChange) return systemStatusFragmentToKey(statusChange[2]);

  const exactKey = CUSTOMER_SYSTEM_MESSAGE_EXACT[raw.toLowerCase()];
  if (exactKey) return exactKey;

  return systemStatusFragmentToKey(raw);
}

/** Compact pill chrome — 10.5px semibold keeps 40+ readability with smaller footprint. */
export const CUSTOMER_STATUS_PILL_BASE =
  "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-px text-[10.5px] font-semibold leading-snug";

export const CUSTOMER_PRIORITY_PILL_BASE =
  "inline-flex h-[22px] min-w-[3.75rem] shrink-0 items-center justify-center rounded-md border px-1.5 text-[10px] font-bold uppercase tracking-[0.06em] tabular-nums leading-none";

/** Tailwind classes for customer-facing status pills — soft fills, readable contrast. */
export function getCustomerStatusBadgeClass(status) {
  switch (status) {
    case "NEW":
      return "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200/90";
    case "IN_PROGRESS":
      return "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200/90";
    case "WAITING_FOR_CUSTOMER":
      return "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200/90";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/90";
    case "CLOSED":
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300/80";
    default:
      return "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200/90";
  }
}

/** Priority chips for ticket list (HIGH / MEDIUM / LOW). */
export function getCustomerPriorityBadgeClass(priority) {
  switch (priority) {
    case "HIGH":
      return "border-rose-200/90 bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200/70";
    case "MEDIUM":
      return "border-amber-200/90 bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200/70";
    case "LOW":
      return "border-emerald-200/90 bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/70";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200/80";
  }
}

/** Accent color (solid hex) for status — used for dots, progress markers, left-edge accents. */
export function getCustomerStatusAccent(status) {
  switch (status) {
    case "NEW":
      return "#0369A1"; // sky-700
    case "IN_PROGRESS":
      return "#6D28D9"; // violet-700
    case "WAITING_FOR_CUSTOMER":
      return "#B45309"; // amber-700
    case "RESOLVED":
      return "#047857"; // emerald-700
    case "CLOSED":
      return "#475569"; // slate-600
    default:
      return "#475569";
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
      return "bg-slate-500 ring-slate-100";
    default:
      return "bg-slate-500 ring-slate-100";
  }
}

const TIMELINE_STEP_MARKER = {
  received: {
    active: "bg-sky-600 text-white ring-1 ring-sky-300/80",
    done: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200/90",
    pending: "bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/80",
  },
  review: {
    active: "bg-violet-600 text-white ring-1 ring-violet-300/80",
    done: "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200/90",
    pending: "bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/80",
  },
  awaiting: {
    active: "bg-amber-600 text-white ring-1 ring-amber-300/80",
    done: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200/90",
    pending: "bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/80",
  },
  resolved: {
    active: "bg-emerald-600 text-white ring-1 ring-emerald-300/80",
    done: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/90",
    pending: "bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/80",
  },
  closed: {
    active: "bg-slate-600 text-white ring-1 ring-slate-400/70",
    done: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300/80",
    pending: "bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/80",
  },
};

export function getCustomerTimelineStepMarkerClass(stepId, { done, active }) {
  const tone = TIMELINE_STEP_MARKER[stepId] || TIMELINE_STEP_MARKER.received;
  if (active) return tone.active;
  if (done) return tone.done;
  return tone.pending;
}

export function getCustomerTimelineStepLabelClass({ done, active }) {
  if (active) return "text-[12px] font-semibold leading-snug text-slate-950";
  if (done) return "text-[12px] font-medium leading-snug text-slate-800";
  return "text-[12px] leading-snug text-slate-500";
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

const CUSTOMER_NEXT_STEP_DEFS = [
  { id: "received", label: "Request received" },
  { id: "review", label: "Our team is reviewing" },
  { id: "awaiting", label: "Awaiting your response" },
  { id: "resolved", label: "Solution provided" },
  { id: "closed", label: "Closed" },
];

/**
 * Checklist + progress bar for “What happens next” — derived from the same rules
 * so the bar does not jump ahead of the visible steps (e.g. assign → 55%).
 *
 * @param {string} status
 * @param {{ assigneeId?: number|string|null }} [options]
 */
export function getCustomerNextStepsModel(status, options = {}) {
  const s = status || "NEW";
  const hasAssignee = options.assigneeId != null && options.assigneeId !== "";
  const teamPickedUp = s !== "NEW" || hasAssignee;

  const flags = {
    received: { done: true, active: false },
    review: {
      done: ["WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"].includes(s),
      active: teamPickedUp && (s === "NEW" || s === "IN_PROGRESS"),
    },
    awaiting: {
      done: s === "RESOLVED" || s === "CLOSED",
      active: s === "WAITING_FOR_CUSTOMER",
    },
    resolved: {
      done: s === "CLOSED",
      active: s === "RESOLVED",
    },
    closed: {
      done: s === "CLOSED",
      active: false,
    },
  };

  const steps = CUSTOMER_NEXT_STEP_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    done: flags[def.id].done,
    active: flags[def.id].active,
  }));

  const total = steps.length;
  const doneCount = steps.filter((step) => step.done).length;
  const hasActive = steps.some((step) => step.active);

  let percent;
  if (s === "CLOSED") {
    percent = 100;
  } else if (hasActive) {
    percent = Math.round(((doneCount + 0.35) / total) * 100);
  } else {
    percent = Math.round((doneCount / total) * 100);
  }
  percent = Math.min(100, Math.max(12, percent));

  return { steps, percent };
}

/** @deprecated Prefer {@link getCustomerNextStepsModel} — kept for single-value callers. */
export function getCustomerProgressPercent(status, options) {
  return getCustomerNextStepsModel(status, options).percent;
}
