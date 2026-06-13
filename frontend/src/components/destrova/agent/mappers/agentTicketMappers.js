import { isEndUserAuthorType, isSystemAuthorType } from "../../shared/commentAuthorType";
import {
  messageMatchesRejectionNote,
  messageMatchesResolutionNote,
} from "../../shared/constants/resolutionNote";
import {
  dedupeSystemTimelineEvents,
  translateSystemTimelineMessage,
} from "../../shared/systemTimelineI18n";
import { htmlToPlainText } from "../../shared/htmlPlainText";

/**
 * Professional ticket id for headers and list: prefer ticketNumber / code from API, else DES-00024.
 * @param {object} [ticket]
 * @returns {string}
 */
export function formatAgentTicketDisplayId(ticket) {
  const t = ticket || {};
  if (t.ticketNumber != null && String(t.ticketNumber).trim() !== "") {
    return String(t.ticketNumber).trim();
  }
  if (t.ticketCode != null && String(t.ticketCode).trim() !== "") {
    return String(t.ticketCode).trim();
  }
  if (t.code != null && String(t.code).trim() !== "") {
    return String(t.code).trim();
  }
  if (t.id != null && t.id !== "") {
    const n = Number(t.id);
    if (!Number.isNaN(n)) {
      return `DES-${String(n).padStart(5, "0")}`;
    }
  }
  return "—";
}

/**
 * @param {object} ticket — backend ticket
 * @param {{ currentUserId?: number|string }} [options]
 * @returns {string|null}
 */
export function formatAssigneeLabel(ticket, options = {}) {
  const t = ticket || {};
  if (t.assigneeId == null) {
    return null;
  }
  const aid = Number(t.assigneeId);
  const me = options.currentUserId != null && Number(options.currentUserId) === aid;
  if (me) {
    return options.t ? options.t("ticket.you") : "You";
  }
  if (t.assignee?.name) {
    return String(t.assignee.name);
  }
  if (t.assigneeName) {
    return String(t.assigneeName);
  }
  return `Agent #${t.assigneeId}`;
}

function pickNonEmpty(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s !== "" && s !== "—") {
      return v;
    }
  }
  return null;
}

/** Account / customer org — never mirror product name (legacy list rows used product as fallback). */
function resolveCustomerOrganization(ticket, row, productName) {
  const raw = pickNonEmpty(
    ticket?.customerName,
    ticket?.accountName,
    ticket?.organization,
    row?.customer,
  );
  if (!raw) return null;
  const product = productName != null ? String(productName).trim() : "";
  if (
    product &&
    String(raw).trim().localeCompare(product, undefined, { sensitivity: "accent" }) === 0
  ) {
    return null;
  }
  return raw;
}

function inferRowActivityIndicators(ticket, resolutionDeclined = false) {
  const t = ticket || {};
  const unread = Number(t.unreadCount ?? t.unread ?? 0) || 0;
  const lastType = t.lastActivityType != null ? String(t.lastActivityType) : "";
  const hasCustomerFlag = Boolean(t.hasCustomerUpdate);
  const comments = Array.isArray(t.comments) ? t.comments : [];
  let lastIsCustomerExternal = false;
  let lastIsInternal = false;
  if (comments.length > 0) {
    const sorted = [...comments].sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return ta - tb;
    });
    const last = sorted[sorted.length - 1];
    if (last) {
      lastIsInternal = Boolean(last.isInternal);
      const at = String(last.authorType || "").toUpperCase();
      lastIsCustomerExternal = !last.isInternal && isEndUserAuthorType(at);
    }
  }
  if (resolutionDeclined) {
    return {
      unread,
      customerReplied: true,
      internalNoteHint: false,
      activityHint: "Customer rejected",
    };
  }
  const customerReplied =
    unread > 0 ||
    hasCustomerFlag ||
    lastType === "CUSTOMER_REPLY" ||
    lastIsCustomerExternal;
  const internalNoteHint = lastIsInternal;
  return {
    unread,
    customerReplied,
    internalNoteHint,
    activityHint: customerReplied ? "Customer replied" : internalNoteHint ? "Internal note" : null,
  };
}

/** Maps backend / API ticket DTOs to Destrova agent list row shape (see mockData MOCK_TICKETS). */

const STATUS_CODE_TO_LABEL = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_CUSTOMER: "Waiting for Customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const PRIORITY_CODE_TO_LABEL = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const SLA_CODE_TO_LABEL = {
  BREACHED: "Breached",
  AT_RISK: "At Risk",
  PAUSED: "Paused",
  SAFE: "Safe",
  STOPPED: "Stopped",
  UNKNOWN: "—",
};

const ENUM_STATUS = new Set(Object.keys(STATUS_CODE_TO_LABEL));
const ENUM_PRIORITY = new Set(Object.keys(PRIORITY_CODE_TO_LABEL));
const ENUM_SLA = new Set(Object.keys(SLA_CODE_TO_LABEL));

const STATUS_I18N_KEYS = {
  NEW: "status.new",
  IN_PROGRESS: "status.inProgress",
  WAITING_FOR_CUSTOMER: "status.waitingForCustomer",
  RESOLVED: "status.resolved",
  CLOSED: "status.closed",
};

const PRIORITY_I18N_KEYS = {
  HIGH: "priority.high",
  MEDIUM: "priority.medium",
  LOW: "priority.low",
};

const SLA_I18N_KEYS = {
  BREACHED: "sla.breached",
  AT_RISK: "sla.atRisk",
  PAUSED: "sla.paused",
  SAFE: "sla.safe",
  STOPPED: "sla.stopped",
};

function normalizeStatusCode(raw) {
  if (raw == null || raw === "") return "NEW";
  const s = String(raw).trim();
  if (ENUM_STATUS.has(s)) return s;
  const enumish = s.toUpperCase().replace(/[\s-]+/g, "_");
  if (ENUM_STATUS.has(enumish)) return enumish;
  const lower = s.toLowerCase();
  for (const [code, label] of Object.entries(STATUS_CODE_TO_LABEL)) {
    if (label.toLowerCase() === lower) return code;
  }
  return s;
}

function normalizePriorityCode(raw) {
  if (raw == null || raw === "") return "MEDIUM";
  const s = String(raw).trim();
  if (ENUM_PRIORITY.has(s)) return s;
  const enumish = s.toUpperCase();
  if (ENUM_PRIORITY.has(enumish)) return enumish;
  const lower = s.toLowerCase();
  for (const [code, label] of Object.entries(PRIORITY_CODE_TO_LABEL)) {
    if (label.toLowerCase() === lower) return code;
  }
  return s;
}

/** @param {string} [raw] @param {(key: string) => string} [t] common namespace */
export function mapTicketStatusLabelI18n(raw, t) {
  if (raw == null || raw === "") return "—";
  const code = normalizeStatusCode(raw);
  if (ENUM_STATUS.has(code) && t) return t(STATUS_I18N_KEYS[code]);
  return mapTicketStatusToAgentLabel(raw);
}

/** @param {string} [raw] @param {(key: string) => string} [t] common namespace */
export function mapPriorityLabelI18n(raw, t) {
  if (raw == null || raw === "") return t ? t("priority.medium") : "Medium";
  const code = normalizePriorityCode(raw);
  if (ENUM_PRIORITY.has(code) && t) return t(PRIORITY_I18N_KEYS[code]);
  return mapPriorityToAgentLabel(raw);
}

/** @param {string} [raw] @param {(key: string) => string} [t] agent namespace */
export function mapSlaStateLabelI18n(raw, t) {
  if (raw == null || raw === "") return "—";
  const s = String(raw).trim();
  const code = s.toUpperCase().replace(/[\s-]+/g, "_");
  if (SLA_I18N_KEYS[code] && t) return t(SLA_I18N_KEYS[code]);
  if (s === "Breached" && t) return t("sla.breached");
  if (s === "At Risk" && t) return t("sla.atRisk");
  if (s === "Paused" && t) return t("sla.paused");
  if (s === "Safe" && t) return t("sla.safe");
  if (s === "Stopped" && t) return t("sla.stopped");
  return mapSlaStateToAgentLabel(raw);
}

/**
 * @param {string} [raw]
 * @returns {string}
 */
export function mapTicketStatusToAgentLabel(raw) {
  if (raw == null || raw === "") return "—";
  const s = String(raw).trim();
  if (ENUM_STATUS.has(s)) {
    return STATUS_CODE_TO_LABEL[s];
  }
  if (s.includes(" ") || s.length > 20) {
    return s;
  }
  return STATUS_CODE_TO_LABEL[s] || s;
}

/** Backend / customer phrases in persisted SYSTEM comments → workflow status key. */
const AGENT_STATUS_FRAGMENT_TO_KEY = {
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

const AGENT_SYSTEM_MESSAGE_EXACT = {
  "customer approved the solution. ticket closed.": "Status changed: → Closed",
  "customer approved the resolution. ticket closed.": "Status changed: → Closed",
  "customer rejected the resolution. ticket reopened.": "Customer declined the solution — reopened",
  "customer declined the solution — ticket reopened.": "Customer declined the solution — reopened",
  "solution proposed — awaiting customer confirmation.": "Solution proposed — awaiting customer review",
};

function agentStatusFragmentToKey(fragment) {
  const trimmed = String(fragment || "")
    .trim()
    .replace(/[.]+$/g, "");
  if (!trimmed) return null;

  const enumish = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
  if (STATUS_CODE_TO_LABEL[enumish]) return enumish;

  const phrase = trimmed.toLowerCase();
  if (AGENT_STATUS_FRAGMENT_TO_KEY[phrase]) return AGENT_STATUS_FRAGMENT_TO_KEY[phrase];

  return null;
}

function agentLabelForStatusFragment(fragment) {
  const key = agentStatusFragmentToKey(fragment);
  if (key) return STATUS_CODE_TO_LABEL[key];

  const normalized = String(fragment || "")
    .trim()
    .toLowerCase();
  for (const label of Object.values(STATUS_CODE_TO_LABEL)) {
    if (label.toLowerCase() === normalized) return label;
  }
  return String(fragment || "").trim() || "—";
}

/**
 * @param {string} message
 * @param {{ ta?: (key: string, opts?: object) => string, tc?: (key: string) => string }} [i18n]
 */
export function formatAgentSystemTimelineMessage(message, i18n) {
  const ta = i18n?.ta;
  const tc = i18n?.tc;
  if (!ta) {
    return translateSystemTimelineMessage(message, {
      t: (key, opts) => key,
      tc: (key, opts) => opts?.defaultValue ?? key,
      messagesPrefix: "timeline.systemMessages",
    });
  }
  return translateSystemTimelineMessage(message, { t: ta, tc, messagesPrefix: "timeline.systemMessages" });
}

/**
 * @param {string} [raw]
 * @returns {string}
 */
export function mapPriorityToAgentLabel(raw) {
  if (raw == null || raw === "") return "Medium";
  const s = String(raw).trim();
  if (ENUM_PRIORITY.has(s)) {
    return PRIORITY_CODE_TO_LABEL[s];
  }
  if (s === "High" || s === "Medium" || s === "Low") {
    return s;
  }
  return PRIORITY_CODE_TO_LABEL[s] || s;
}

/**
 * @param {string} [raw]
 * @returns {string}
 */
export function mapSlaStateToAgentLabel(raw) {
  if (raw == null || raw === "") return "Safe";
  const s = String(raw).trim();
  if (ENUM_SLA.has(s)) {
    return SLA_CODE_TO_LABEL[s];
  }
  if (s === "Breached" || s === "At Risk" || s === "Paused" || s === "Safe" || s === "Stopped") {
    return s;
  }
  return SLA_CODE_TO_LABEL[s] || s;
}

function formatRelativeShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return day === 1 ? "Yesterday" : `${day}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDurationShort(ms) {
  if (ms <= 0) return "0m";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 48) {
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function formatAgoShort(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "";
  return formatDurationShort(diff);
}

/**
 * Heuristic SLA row fields when the API only exposes `slaDueDate` (or nothing).
 * @param {object} ticket
 * @param {string|number} [ticket.slaDueDate]
 * @param {string} [ticket.slaState]
 * @param {string} [ticket.status] — backend enum
 */
export function deriveSlaRowFields(ticket) {
  const pre = ticket?.slaState != null && String(ticket.slaState).trim() !== "";
  if (pre) {
    const state = mapSlaStateToAgentLabel(ticket.slaState);
    const at = ticket.slaDueDate || null;
    const rawS = String(ticket.slaState).trim();
    if (rawS === "STOPPED" || state === "Stopped") {
      return { slaState: "Stopped", slaDue: "—", slaDueAt: at };
    }
    if (rawS === "UNKNOWN" || state === "—") {
      return { slaState: "—", slaDue: "—", slaDueAt: at };
    }
    let due = "—";
    if (at) {
      const dueDate = new Date(at);
      if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() > Date.now()) {
        due = `Due in ${formatDurationShort(dueDate.getTime() - Date.now())}`;
      } else if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() <= Date.now() && (rawS === "BREACHED" || state === "Breached")) {
        const ago = formatAgoShort(at);
        due = ago ? `Breached ${ago} ago` : "Breached";
      } else {
        due = "—";
      }
    }
    return { slaState: state, slaDue: due, slaDueAt: at };
  }

  const raw = ticket?.slaDueDate;
  if (raw == null) {
    return { slaState: "Paused", slaDue: "—", slaDueAt: null };
  }
  const due = new Date(raw);
  if (Number.isNaN(due.getTime())) {
    return { slaState: "Safe", slaDue: "—", slaDueAt: null };
  }
  const now = Date.now();
  const t = due.getTime();
  if (t < now) {
    const ago = formatAgoShort(raw);
    return {
      slaState: "Breached",
      slaDue: ago ? `Breached ${ago} ago` : "Breached",
      slaDueAt: raw,
    };
  }
  const msLeft = t - now;
  const hLeft = msLeft / 3600000;
  if (hLeft <= 24) {
    return {
      slaState: "At Risk",
      slaDue: `Due in ${formatDurationShort(msLeft)}`,
      slaDueAt: raw,
    };
  }
  return {
    slaState: "Safe",
    slaDue: `Due in ${formatDurationShort(msLeft)}`,
    slaDueAt: raw,
  };
}

/**
 * @param {object} ticket — backend or API object
 * @param {{ currentUserId?: number|string }} [options] — for "You" in assignee column
 * @returns {object} agent list row
 */
export function mapBackendTicketToAgentRow(ticket, options = {}) {
  const t = ticket || {};
  const id = t.id != null ? String(t.id) : "";
  const displayId = formatAgentTicketDisplayId(t);
  const title = t.title != null && String(t.title).trim() !== "" ? String(t.title) : "—";
  const statusCode = normalizeStatusCode(t.status);
  const priorityCode = normalizePriorityCode(t.priority);
  const status = mapTicketStatusToAgentLabel(t.status);
  const priority = mapPriorityToAgentLabel(t.priority);
  const productName = t.product?.name != null && String(t.product.name).trim() !== "" ? String(t.product.name) : "General";
  const customer = resolveCustomerOrganization(t, null, productName) || "—";
  const requester = t.creatorName || t.requesterName || "—";
  const requesterEmail = t.creatorEmail || t.requesterEmail || "—";

  const assignee = formatAssigneeLabel(t, options);
  const hasRejectionNote =
    t.customerRejectionNote != null && String(t.customerRejectionNote).trim() !== "";

  const updatedSrc = t.updatedAt || t.modifiedAt;
  const createdSrc = t.createdAt;
  const updatedAt = formatRelativeShort(updatedSrc);
  const { slaState, slaDue, slaDueAt } = deriveSlaRowFields(t);
  const updatedRank = (() => {
    const d = new Date(updatedSrc);
    if (Number.isNaN(d.getTime())) return 0;
    return d.getTime();
  })();

  const seenMap = options.seenUpdatedAtByTicket && typeof options.seenUpdatedAtByTicket === "object"
    ? options.seenUpdatedAtByTicket
    : {};
  const seenAt = seenMap[id];
  const lastTouchIso = updatedSrc || createdSrc;
  const isClosed = String(t.status || "").toUpperCase() === "CLOSED";
  const hasUnseenBySeen =
    !isClosed &&
    lastTouchIso != null &&
    (seenAt == null || String(seenAt).trim() === "" || new Date(lastTouchIso) > new Date(seenAt));
  const resolutionDeclined = hasRejectionNote && hasUnseenBySeen;
  const activity = inferRowActivityIndicators(t, resolutionDeclined);
  const unreadForUi = hasUnseenBySeen ? Math.max(1, Number(activity.unread) || 0) : 0;
  const activityLabel =
    resolutionDeclined
      ? null
      : t.pendingTransferToAgentId != null &&
          options.currentUserId != null &&
          Number(t.pendingTransferToAgentId) === Number(options.currentUserId)
        ? "Transfer pending"
        : activity.activityHint || (unreadForUi > 0 ? "New update" : null);

  const pendingTransferToMe =
    t.pendingTransferToAgentId != null &&
    options.currentUserId != null &&
    Number(t.pendingTransferToAgentId) === Number(options.currentUserId);
  const pendingTransferFromMe =
    t.pendingTransferFromAgentId != null &&
    options.currentUserId != null &&
    Number(t.pendingTransferFromAgentId) === Number(options.currentUserId);

  return {
    id,
    displayId,
    title,
    customer,
    requester,
    requesterEmail,
    productName,
    status,
    statusCode,
    priority,
    priorityCode,
    assignee,
    assignedToMe:
      options.currentUserId != null &&
      t.assigneeId != null &&
      Number(options.currentUserId) === Number(t.assigneeId),
    unread: unreadForUi,
    customerReplied: activity.customerReplied,
    internalNoteHint: activity.internalNoteHint,
    activityHint: activity.activityHint,
    activityLabel: activityLabel || null,
    resolutionDeclined,
    hasUnseenBySeen,
    lastTouchIso:
      lastTouchIso != null
        ? typeof lastTouchIso === "string"
          ? lastTouchIso
          : new Date(lastTouchIso).toISOString()
        : null,
    updatedAt,
    slaState,
    slaDue,
    slaDueAt: slaDueAt != null && slaDueAt !== "" ? (typeof slaDueAt === "string" ? slaDueAt : new Date(slaDueAt).toISOString()) : null,
    createdAt: createdSrc != null ? (typeof createdSrc === "string" ? createdSrc : new Date(createdSrc).toISOString()) : null,
    updatedRank,
    pendingTransferToMe,
    pendingTransferFromMe,
    assigneeId: t.assigneeId ?? null,
  };
}

function formatFileSize(bytes) {
  if (bytes == null || bytes === 0) return "0 B";
  let n = Number(bytes);
  if (Number.isNaN(n) || n < 0) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i += 1;
  }
  if (i === 0) return `${Math.round(n)} ${u[i]}`;
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${u[i]}`;
}

function formatHeaderDateTime(value) {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export function formatTimelineAt(value) {
  if (value == null || value === "") return "—";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function resolveRequesterDisplayName(apiTicket, row) {
  const t = apiTicket || {};
  const r = row || {};
  const name = pickNonEmpty(t.creatorName, t.requesterName, t.creator?.name, r.requester);
  if (name) {
    return String(name);
  }
  if (t.creatorId != null) {
    return `Requester (user #${t.creatorId})`;
  }
  return "—";
}

function resolveRequesterEmailDisplay(apiTicket, row) {
  const t = apiTicket || {};
  const r = row || {};
  const email = pickNonEmpty(t.creatorEmail, t.requesterEmail, r.requesterEmail);
  return email ? String(email) : "—";
}

/**
 * Workspace header + right rail detail object.
 * @param {object|null} apiTicket — full ticket from getTicketById (or null while loading / on error)
 * @param {{ selectedRow?: object, appUser?: { id?: number|string } }} ctx
 */
export function mapBackendTicketToWorkspaceDetail(apiTicket, ctx = {}) {
  const t = apiTicket && apiTicket.id != null ? apiTicket : null;
  const row = ctx.selectedRow || {};
  const appUser = ctx.appUser;

  const id = formatAgentTicketDisplayId(t || { id: row.id });

  const title = pickNonEmpty(t?.title, row.title) || "—";

  const productName = pickNonEmpty(t?.product?.name, row.productName) || "General";
  const organization = resolveCustomerOrganization(t, row, productName);

  const requesterName = resolveRequesterDisplayName(t, row);
  const requesterEmail = resolveRequesterEmailDisplay(t, row);

  const statusCode = normalizeStatusCode(t?.status ?? row.status);
  const priorityCode = normalizePriorityCode(t?.priority ?? row.priority);
  const status = mapTicketStatusToAgentLabel(t?.status ?? row.status);
  const priority = mapPriorityToAgentLabel(t?.priority ?? row.priority);

  let slaState;
  let slaDue;
  let slaDueAt = null;
  if (t) {
    const d = deriveSlaRowFields(t);
    slaState = d.slaState;
    slaDue = d.slaDue;
    slaDueAt = d.slaDueAt;
  } else {
    slaState = row.slaState || "Safe";
    slaDue = row.slaDue || "—";
    slaDueAt = row.slaDueAt ?? null;
  }

  const openedAt = formatHeaderDateTime(t?.createdAt || row.createdAt);
  const updatedAt = t
    ? formatHeaderDateTime(t.updatedAt)
    : pickNonEmpty(row.updatedAt) != null
      ? String(row.updatedAt)
      : "—";

  const assignee = t ? formatAssigneeLabel(t, { currentUserId: appUser?.id }) : row.assignee;

  return {
    id,
    title,
    organization,
    customer: organization,
    requesterName,
    requesterEmail,
    productName,
    status,
    statusCode,
    priority,
    priorityCode,
    openedAt,
    updatedAt,
    slaState,
    slaDue,
    slaDueAt,
    assignee: assignee != null && assignee !== "" ? assignee : null,
  };
}

/**
 * @param {object[]} rawAttachments
 * @returns {{ id: number, name: string, size: string, who: string, when: string }[]}
 */
export function mapBackendAttachmentsForRail(rawAttachments) {
  if (!Array.isArray(rawAttachments) || rawAttachments.length === 0) {
    return [];
  }
  return rawAttachments.map((a) => ({
    id: a.id,
    name: a.fileName || a.name || "file",
    size: formatFileSize(a.fileSize),
    who: a.uploadedBySub ? "Uploader" : "—",
    when: a.uploadedAt != null ? formatRelativeShort(a.uploadedAt) : "—",
  }));
}

/**
 * Text for the Issue description card: ticket.description, else first customer external comment.
 * @param {object|null} apiTicket
 * @returns {{ text: string, source: string, isEmpty: boolean }}
 */
export function buildIssueDescriptionBlock(apiTicket) {
  const t = apiTicket || {};
  const descRaw = t.description;
  if (descRaw != null && String(descRaw).trim() !== "") {
    return { text: htmlToPlainText(String(descRaw)), source: "description", isEmpty: false };
  }
  const comments = Array.isArray(t.comments) ? t.comments : [];
  const customerMsgs = comments
    .filter(
      (c) => c && !c.isInternal && isEndUserAuthorType(c.authorType),
    )
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const firstCustomer = customerMsgs[0];
  if (firstCustomer) {
    const text = htmlToPlainText(firstCustomer.message || "");
    return { text, source: "first_message", isEmpty: !String(text).trim() };
  }
  return { text: "", source: "none", isEmpty: true };
}

/**
 * Activity feed for the agent workspace: oldest → newest.
 * @param {object} apiTicket
 * @param {object[]|null|undefined} rawAttachments
 * @returns {Array<object>}
 */
export function buildAgentTimelineEvents(apiTicket, rawAttachments) {
  const t = apiTicket || {};
  const atts = Array.isArray(rawAttachments) ? rawAttachments : [];
  const out = [];
  let order = 0;
  const push = (e) => {
    const st = e.sortTime;
    if (!Number.isFinite(st)) {
      e.sortTime = 0;
    }
    e._order = order++;
    out.push(e);
  };

  const requesterLabel = pickNonEmpty(t.creatorName, t.requesterName) || "Requester";
  const descPlain = t.description != null && String(t.description).trim() !== "" ? htmlToPlainText(String(t.description)) : "";
  let hasOriginalRequest = false;
  if (descPlain && t.createdAt) {
    const st = new Date(t.createdAt).getTime();
    if (Number.isFinite(st)) {
      hasOriginalRequest = true;
      push({
        eventKey: `orig-${t.id || "t"}`,
        type: "original_request",
        at: formatTimelineAt(t.createdAt),
        label: "Original request",
        title: requesterLabel,
        actorName: requesterLabel,
        avatarText: "OR",
        body: descPlain,
        meta: null,
        sortTime: st - 3,
      });
    }
  }

  if (t.createdAt && !hasOriginalRequest) {
    const st = new Date(t.createdAt).getTime();
    if (Number.isFinite(st)) {
      push({
        eventKey: `sys-created-${t.id || "t"}`,
        type: "status_change",
        variant: "system",
        at: formatTimelineAt(t.createdAt),
        label: "System",
        title: "Ticket created",
        body: "Ticket was opened in the helpdesk queue.",
        meta: "System",
        sortTime: st,
        systemKind: "created",
      });
    }
  }

  const comments = Array.isArray(t.comments) ? t.comments : [];
  for (const c of comments) {
    const rawTime = c.createdAt;
    const sortTime = rawTime ? new Date(rawTime).getTime() : 0;
    const isInternal = Boolean(c.isInternal);
    const authorType = String(c.authorType || "").toUpperCase();
    const fromEndUser = isEndUserAuthorType(authorType);
    const fromSystem = isSystemAuthorType(authorType);
    let type = "agent_reply";
    if (isInternal) {
      type = "internal_note";
    } else if (fromSystem) {
      type = "system_note";
    } else if (fromEndUser) {
      type = "customer_reply";
    } else {
      type = "agent_reply";
    }
    const actorName =
      c.authorName && String(c.authorName).trim() !== ""
        ? String(c.authorName)
        : fromEndUser
          ? "Customer"
          : "Agent";
    const rawMessage = c.message != null ? String(c.message) : "";
    const bodyPlain = htmlToPlainText(rawMessage);
    if (fromSystem) {
      const isStatusLine = /^Status changed:/i.test(bodyPlain);
      const isWorkflowEvent =
        isStatusLine ||
        /solution proposed/i.test(bodyPlain) ||
        /declined the solution/i.test(bodyPlain) ||
        /customer approved/i.test(bodyPlain);
      push({
        eventKey: c.id != null ? `c-${c.id}` : `c-${order}`,
        type: "system_note",
        at: formatTimelineAt(rawTime),
        label: isWorkflowEvent ? "Status" : "System",
        title: isWorkflowEvent ? "Status update" : c.authorName || "System",
        body: bodyPlain || "—",
        sortTime: Number.isFinite(sortTime) ? sortTime : 0,
      });
      continue;
    }
    const isResolutionProposal =
      !isInternal && !fromEndUser && messageMatchesResolutionNote(rawMessage, t.resolutionNote);
    const isRejectionFeedback =
      fromEndUser && messageMatchesRejectionNote(rawMessage, t.customerRejectionNote);
    push({
      eventKey: c.id != null ? `c-${c.id}` : `c-${order}`,
      type,
      at: formatTimelineAt(rawTime),
      label: isInternal
        ? "Internal note"
        : fromEndUser
          ? isRejectionFeedback
            ? "Customer declined"
            : "Customer message"
          : isResolutionProposal
            ? "Solution proposed"
            : "Agent reply",
      title: actorName,
      actorName,
      avatarText: isInternal ? "IN" : fromEndUser ? "CU" : "AG",
      body: rawMessage.trim() !== "" ? rawMessage : "—",
      meta: isInternal
        ? null
        : fromEndUser
          ? isRejectionFeedback
            ? "Decline reason"
            : null
          : isResolutionProposal
            ? "Awaiting customer review"
            : null,
      sortTime: Number.isFinite(sortTime) ? sortTime : 0,
      internalOnly: isInternal,
      durationMinutes: null,
    });
  }

  const resolutionNote = t.resolutionNote != null ? String(t.resolutionNote).trim() : "";
  const hasResolutionComment =
    resolutionNote !== "" &&
    comments.some(
      (c) =>
        !Boolean(c.isInternal) &&
        String(c.authorType || "").toUpperCase() === "AGENT" &&
        messageMatchesResolutionNote(c.message, resolutionNote),
    );
  if (resolutionNote && !hasResolutionComment) {
    const fallbackTime = t.updatedAt || t.closedAt;
    const st = fallbackTime ? new Date(fallbackTime).getTime() : Date.now();
    push({
      eventKey: `resolution-fallback-${t.id || "t"}`,
      type: "agent_reply",
      at: formatTimelineAt(fallbackTime),
      label: "Solution proposed",
      title: "Agent",
      actorName: "Agent",
      avatarText: "AG",
      body: resolutionNote,
      meta: "Awaiting customer review",
      sortTime: Number.isFinite(st) ? st - 1 : 0,
    });
  }

  const rejectionNote =
    t.customerRejectionNote != null ? String(t.customerRejectionNote).trim() : "";
  const hasRejectionComment =
    rejectionNote !== "" &&
    comments.some(
      (c) =>
        !Boolean(c.isInternal) &&
        isEndUserAuthorType(String(c.authorType || "")) &&
        messageMatchesRejectionNote(c.message, rejectionNote),
    );
  if (rejectionNote && !hasRejectionComment) {
    const fallbackTime = t.updatedAt;
    const st = fallbackTime ? new Date(fallbackTime).getTime() : Date.now();
    push({
      eventKey: `rejection-fallback-${t.id || "t"}`,
      type: "customer_reply",
      at: formatTimelineAt(fallbackTime),
      label: "Customer declined",
      title: t.creatorName || "Customer",
      actorName: t.creatorName || "Customer",
      avatarText: "CU",
      body: rejectionNote,
      meta: "Decline reason",
      sortTime: Number.isFinite(st) ? st - 1 : 0,
    });
  }

  const worklogs = Array.isArray(t.worklogs) ? t.worklogs : [];
  for (const w of worklogs) {
    const rawTime = w.workDate;
    const sortTime = rawTime ? new Date(rawTime).getTime() : 0;
    const dm = w.durationMinutes != null ? Number(w.durationMinutes) : null;
    const worklogBody = w.description != null ? String(w.description) : "";
    push({
      eventKey: w.id != null ? `w-${w.id}` : `w-${order}`,
      type: "worklog",
      at: formatTimelineAt(rawTime),
      label: "Worklog",
      title: "Worklog",
      actorName: "Worklog",
      avatarText: "WL",
      body: worklogBody.trim() !== "" ? worklogBody : "—",
      meta: dm != null && !Number.isNaN(dm) ? `Duration · ${dm}m` : "Time logged",
      sortTime: Number.isFinite(sortTime) ? sortTime : 0,
      durationMinutes: dm,
    });
  }

  for (const a of atts) {
    const rawTime = a.uploadedAt;
    const st = rawTime ? new Date(rawTime).getTime() : 0;
    push({
      eventKey: a.id != null ? `a-${a.id}` : `a-${order}`,
      type: "attachment",
      at: formatTimelineAt(rawTime),
      label: "Attachment",
      title: a.fileName || a.name || "File",
      body: "File attached to this ticket.",
      meta: "Upload",
      sortTime: Number.isFinite(st) ? st : 0,
      attachmentId: a.id,
      fileName: a.fileName || a.name || "file",
      fileSize: formatFileSize(a.fileSize),
    });
  }

  // Closure and status history: prefer persisted SYSTEM comments from the API (chronological with messages).

  return dedupeSystemTimelineEvents(
    out
      .sort((a, b) => {
        const d = a.sortTime - b.sortTime;
        if (d !== 0) return d;
        return (a._order || 0) - (b._order || 0);
      })
      .map((e) => {
        const { _order: _o, ...rest } = e;
        return rest;
      }),
  );
}

/**
 * @param {object} detail — result of mapBackendTicketToWorkspaceDetail
 * @returns {{ role: string, name: string, email: string }[]}
 */
export function buildAgentPeopleFromDetail(detail) {
  if (!detail) {
    return [];
  }
  return [
    { role: "Requester", name: detail.requesterName || "—", email: detail.requesterEmail || "—" },
    { role: "Assignee", name: detail.assignee || "Unassigned", email: "—" },
  ];
}
