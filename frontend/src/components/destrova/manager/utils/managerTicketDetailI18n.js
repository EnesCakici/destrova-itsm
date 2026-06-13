import { formatClosureReasonI18n } from "../../shared/constants/closureReasons";
import { translateManagerPriorityCode, translateManagerStatusCode } from "./managerFilterI18n";
import {
  dedupeSystemTimelineEvents,
  extractStatusArrowDetail,
  isSystemStatusArrowMessage,
  isSystemWorkflowMessage,
  translateSystemTimelineMessage,
  translateTimelineMeta,
} from "../../shared/systemTimelineI18n";

export const MANAGER_DETAIL_STATUS_OPTIONS = [
  "New",
  "In Progress",
  "Waiting for Customer",
  "Resolved",
  "Closed",
];

export const MANAGER_DETAIL_PRIORITY_OPTIONS = ["High", "Medium", "Low"];

const STATUS_LABEL_TO_CODE = {
  New: "NEW",
  "In Progress": "IN_PROGRESS",
  "Waiting for Customer": "WAITING_FOR_CUSTOMER",
  Resolved: "RESOLVED",
  Closed: "CLOSED",
};

const PRIORITY_LABEL_TO_CODE = {
  High: "HIGH",
  Medium: "MEDIUM",
  Low: "LOW",
};

/** @param {string} label @param {(key: string) => string} tc */
export function translateManagerDetailStatusLabel(label, tc) {
  const code = STATUS_LABEL_TO_CODE[label];
  return code ? translateManagerStatusCode(code, tc) : label;
}

/** @param {string} label @param {(key: string) => string} tc */
export function translateManagerDetailPriorityLabel(label, tc) {
  const code = PRIORITY_LABEL_TO_CODE[label];
  return code ? translateManagerPriorityCode(code, tc) : label;
}

/** @param {(key: string) => string} tc */
export function buildManagerDetailStatusOptions(tc) {
  return MANAGER_DETAIL_STATUS_OPTIONS.map((value) => ({
    value,
    label: translateManagerDetailStatusLabel(value, tc),
  }));
}

/** @param {(key: string) => string} tc */
export function buildManagerDetailPriorityOptions(tc) {
  return MANAGER_DETAIL_PRIORITY_OPTIONS.map((value) => ({
    value,
    label: translateManagerDetailPriorityLabel(value, tc),
  }));
}

/** @param {string[]} reasonKeys @param {(key: string) => string} tc */
export function buildManagerClosureReasonOptions(reasonKeys, tc) {
  return (reasonKeys || []).map((value) => ({
    value,
    label: formatClosureReasonI18n(value, tc),
  }));
}

/** @param {{ type?: string }} entry @param {(key: string) => string} tm */
export function translateManagerTimelineKind(entry, tm) {
  const type = entry?.type;
  if (type === "worklog") return tm("ticketDetail.timeline.kinds.worklog");
  if (type === "status_change") return tm("ticketDetail.timeline.kinds.status");
  if (type === "customer_reply") return tm("ticketDetail.timeline.kinds.customer");
  if (type === "internal_note") return tm("ticketDetail.timeline.kinds.internal");
  if (type === "agent_reply") return tm("ticketDetail.timeline.kinds.agent");
  if (type === "sla_warning") return tm("ticketDetail.timeline.kinds.sla");
  if (type === "assignment") return tm("ticketDetail.timeline.kinds.assignment");
  if (type === "priority_change") return tm("ticketDetail.timeline.kinds.activity");
  return tm("ticketDetail.timeline.kinds.activity");
}

/** @param {{ type?: string }} entry @param {(key: string) => string} tm */
export function managerTimelineBadgeLabel(entry, tm) {
  switch (entry?.type) {
    case "customer_reply":
      return tm("ticketDetail.timeline.badges.customer");
    case "agent_reply":
      return tm("ticketDetail.timeline.badges.publicReply");
    case "internal_note":
      return tm("ticketDetail.timeline.badges.internal");
    case "worklog":
      return tm("ticketDetail.timeline.badges.worklog");
    default:
      return translateManagerTimelineKind(entry, tm);
  }
}

/** @param {string|null|undefined} meta @param {(key: string, opts?: object) => string} tm */
export function translateManagerTimelineMeta(meta, tm) {
  return translateTimelineMeta(meta, tm);
}

/** @param {string|null|undefined} body @param {(key: string, opts?: object) => string} tm @param {(key: string, opts?: object) => string} tc */
export function translateManagerSystemTimelineBody(body, tm, tc) {
  return translateSystemTimelineMessage(body, {
    t: tm,
    tc,
    messagesPrefix: "ticketDetail.timeline.systemMessages",
  });
}

/** @param {string|null|undefined} body @param {(key: string, opts?: object) => string} tm @param {(key: string, opts?: object) => string} tc */
export function formatManagerSystemTimelineCompact(body, tm, tc) {
  const raw = String(body || "").trim();
  const translated = translateManagerSystemTimelineBody(raw, tm, tc);
  const isStatusArrow = isSystemStatusArrowMessage(raw);
  const isWorkflow = isSystemWorkflowMessage(raw);
  const kindKey = isStatusArrow || isWorkflow ? "status" : "system";
  const message = isStatusArrow ? extractStatusArrowDetail(translated) : translated;
  return { kindKey, message };
}

/** Classify SYSTEM comment for timeline entry type. @param {string} message */
export function classifyManagerSystemCommentType(message) {
  const raw = String(message || "").trim();
  if (/^Ticket assigned to/i.test(raw) || /^Ticket unassigned/i.test(raw)) return "assignment";
  if (/^Priority changed:/i.test(raw)) return "priority_change";
  return "status_change";
}

export { dedupeSystemTimelineEvents };

/** @param {string|null|undefined} iso @param {string} [lang] */
export function formatManagerTicketDetailAt(iso, lang) {
  if (iso == null) return "—";
  try {
    const locale = String(lang ?? "").toLowerCase().startsWith("tr") ? "tr-TR" : undefined;
    return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}
