/** Backend phrases in persisted SYSTEM comments → workflow status key. */
const STATUS_FRAGMENT_TO_KEY = {
  new: "NEW",
  "in progress": "IN_PROGRESS",
  "waiting for you": "WAITING_FOR_CUSTOMER",
  "waiting for customer": "WAITING_FOR_CUSTOMER",
  resolved: "RESOLVED",
  closed: "CLOSED",
  "request received": "NEW",
  "our team is reviewing": "IN_PROGRESS",
  "awaiting your response": "WAITING_FOR_CUSTOMER",
  "solution provided": "RESOLVED",
};

const SYSTEM_MESSAGE_EXACT = {
  "customer approved the solution. ticket closed.": "customerApproved",
  "customer approved the resolution. ticket closed.": "customerApproved",
  "customer rejected the resolution. ticket reopened.": "customerDeclined",
  "customer declined the solution — ticket reopened.": "customerDeclined",
  "solution proposed — awaiting customer confirmation.": "solutionProposed",
};

/** @param {string} fragment */
function statusFragmentToKey(fragment) {
  const trimmed = String(fragment || "")
    .trim()
    .replace(/[.]+$/g, "");
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (STATUS_FRAGMENT_TO_KEY[lower]) return STATUS_FRAGMENT_TO_KEY[lower];
  const code = trimmed.toUpperCase().replace(/\s+/g, "_");
  if (["NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"].includes(code)) {
    return code;
  }
  return null;
}

/** @param {string} code @param {(key: string, opts?: object) => string} tc */
function translatePriorityCode(code, tc) {
  const upper = String(code || "").trim().toUpperCase();
  const keyMap = { HIGH: "high", MEDIUM: "medium", LOW: "low" };
  const key = keyMap[upper];
  return key ? tc(`priority.${key}`, { defaultValue: code }) : code;
}

const STATUS_EN_TO_I18N_KEY = {
  new: "new",
  "in progress": "inProgress",
  "waiting for you": "waitingForCustomer",
  "waiting for customer": "waitingForCustomer",
  resolved: "resolved",
  closed: "closed",
};

/** @param {string} fragment @param {(key: string, opts?: object) => string} tc */
function translateStatusFragment(fragment, tc) {
  const trimmed = String(fragment || "").trim();
  const codeKey = statusFragmentToKey(trimmed);
  if (codeKey) {
    const i18nKey = {
      NEW: "new",
      IN_PROGRESS: "inProgress",
      WAITING_FOR_CUSTOMER: "waitingForCustomer",
      RESOLVED: "resolved",
      CLOSED: "closed",
    }[codeKey];
    if (i18nKey) return tc(`status.${i18nKey}`, { defaultValue: trimmed });
  }
  const directKey = STATUS_EN_TO_I18N_KEY[trimmed.toLowerCase()];
  if (directKey) return tc(`status.${directKey}`, { defaultValue: trimmed });
  return trimmed;
}

/**
 * @param {string} raw
 * @param {{ t: (key: string, opts?: object) => string, tc: (key: string, opts?: object) => string, messagesPrefix?: string }} opts
 */
export function translateSystemTimelineMessage(raw, { t, tc, messagesPrefix = "timeline.systemMessages" }) {
  const text = String(raw || "").trim();
  if (!text) return t(`${messagesPrefix}.update`);

  const msg = (key, opts) => t(`${messagesPrefix}.${key}`, opts);

  const priorityChange = text.match(/^Priority changed:\s*(\w+)\s*→\s*(\w+)\.?$/i);
  if (priorityChange) {
    return msg("priorityChanged", {
      from: translatePriorityCode(priorityChange[1], tc),
      to: translatePriorityCode(priorityChange[2], tc),
    });
  }

  const assigned = text.match(/^Ticket assigned to\s+(.+?)\.?$/i);
  if (assigned) {
    return msg("ticketAssigned", { agent: assigned[1].trim() });
  }

  if (/^Ticket unassigned\.?$/i.test(text)) {
    return msg("ticketUnassigned");
  }

  const statusChange = text.match(/^Status changed:\s*(.+?)\s*→\s*(.+?)\.?$/i);
  if (statusChange) {
    const fromLabel = translateStatusFragment(statusChange[1], tc);
    const toLabel = translateStatusFragment(statusChange[2], tc);
    if (fromLabel && toLabel && fromLabel !== toLabel) {
      return msg("statusChanged", { from: fromLabel, to: toLabel });
    }
    if (toLabel) {
      return msg("statusChangedTo", { to: toLabel });
    }
  }

  const exactKey = SYSTEM_MESSAGE_EXACT[text.toLowerCase()];
  if (exactKey) return msg(exactKey);

  const loneKey = statusFragmentToKey(text);
  if (loneKey) {
    const label = translateStatusFragment(text, tc);
    return msg("statusChangedTo", { to: label });
  }

  return text;
}

/**
 * Compact detail for status-arrow lines (e.g. "In Progress → Resolved").
 * @param {string} translated
 */
export function extractStatusArrowDetail(translated) {
  const text = String(translated || "").trim();
  const arrowIdx = text.indexOf("→");
  if (arrowIdx === -1) return text;
  const colonIdx = text.indexOf(":");
  if (colonIdx !== -1 && colonIdx < arrowIdx) {
    return text.slice(colonIdx + 1).trim();
  }
  return text;
}

/** @param {string} raw */
export function isSystemStatusArrowMessage(raw) {
  return /^Status changed:\s*.+?\s*→\s*.+?\.?$/i.test(String(raw || "").trim());
}

/** @param {string} raw */
export function isSystemWorkflowMessage(raw) {
  const lower = String(raw || "").trim().toLowerCase();
  return (
    isSystemStatusArrowMessage(raw) ||
    lower === "customer approved the solution. ticket closed." ||
    lower === "customer approved the resolution. ticket closed." ||
    lower === "customer rejected the resolution. ticket reopened." ||
    lower === "customer declined the solution — ticket reopened." ||
    lower === "solution proposed — awaiting customer confirmation."
  );
}

/** @param {string} raw */
export function classifySystemTimelineMessage(raw) {
  const text = String(raw || "").trim();
  if (/^Priority changed:/i.test(text)) return "priority";
  if (/^Ticket assigned to/i.test(text) || /^Ticket unassigned/i.test(text)) return "assignment";
  if (/^Status changed:/i.test(text)) return "status";
  if (isSystemWorkflowMessage(text) && !/^Status changed:/i.test(text)) return "workflow";
  return "generic";
}

/** @param {string|null|undefined} meta @param {(key: string) => string} t */
export function translateTimelineMeta(meta, t) {
  if (!meta) return meta;
  const s = String(meta).trim();
  if (s === "Awaiting customer review") return t("timeline.meta.awaitingReview");
  if (s === "Decline reason") return t("timeline.meta.declineReason");
  const worklog = s.match(/^Worklog · (\d+)m$/i);
  if (worklog) return t("ticketDetail.timeline.worklogMeta", { minutes: worklog[1] });
  const worklogTr = s.match(/^Worklog · (\d+) dk$/i);
  if (worklogTr) return s;
  return s;
}

/**
 * Drops duplicate system timeline rows (same body within the same second).
 * Handles double projection when sync API + jBPM webhook both append comments.
 * @param {Array<object>} events
 */
export function dedupeSystemTimelineEvents(events) {
  if (!Array.isArray(events) || !events.length) return events;

  const systemTypes = new Set([
    "system_note",
    "status_change",
    "assignment",
    "priority_change",
    "closure",
  ]);
  const seen = new Set();

  return events.filter((event) => {
    if (!systemTypes.has(event?.type)) return true;
    const body = String(event.body || "").trim().toLowerCase();
    if (!body) return true;
    const bucket = Math.floor((event.sortTime ?? event._ts ?? 0) / 1000);
    const key = `${body}|${bucket}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
