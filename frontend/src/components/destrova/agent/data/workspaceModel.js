import { htmlToPlainText } from "../../shared/htmlPlainText";
import { MOCK_TICKET_DETAIL, MOCK_TICKETS } from "./mockData";

/** Backend ile uyumlu @email mention deseni (group 1 = e-posta). */
const MENTION_EMAIL_SOURCE = "@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})";

/**
 * Düz metinde geçen @mention e-postalarını küçük harfle döndürür.
 * @param {string} [text]
 * @returns {Set<string>}
 */
export function collectMentionEmailsFromPlainText(text) {
  const out = new Set();
  if (text == null || String(text).trim() === "") return out;
  const re = new RegExp(MENTION_EMAIL_SOURCE, "gi");
  let m;
  while ((m = re.exec(String(text))) !== null) {
    if (m[1]) out.add(String(m[1]).trim().toLowerCase());
  }
  return out;
}

/**
 * Agent'ın internal mention zincirinde olup olmadığı: herhangi bir internal yorumda @email ile anılıyor mu?
 * @param {object} backendTicket — API ticket (comments dizisi olmalı)
 * @param {{ email?: string|null }} [ctx]
 * @returns {boolean}
 */
export function isTicketInvolvedForAgent(backendTicket, ctx = {}) {
  const emailRaw = ctx.email;
  if (emailRaw == null || String(emailRaw).trim() === "") return false;
  const myEmail = String(emailRaw).trim().toLowerCase();
  const t = backendTicket || {};
  const comments = Array.isArray(t.comments) ? t.comments : [];
  for (const c of comments) {
    if (!c || !c.isInternal) continue;
    const plain = htmlToPlainText(c.message || "");
    const mentioned = collectMentionEmailsFromPlainText(plain);
    if (mentioned.has(myEmail)) return true;
  }
  return false;
}

/**
 * Internal yorumlardaki @e-posta mention'ları benzersiz liste (People / Involved UI).
 * @param {object} backendTicket
 * @returns {{ email: string, displayName: string }[]}
 */
export function listInvolvedMentionPeopleFromTicket(backendTicket) {
  const t = backendTicket || {};
  const comments = Array.isArray(t.comments) ? t.comments : [];
  /** @type {Map<string, { email: string, displayName: string }>} */
  const byKey = new Map();
  for (const c of comments) {
    if (!c || !c.isInternal) continue;
    const plain = htmlToPlainText(c.message || "");
    const emails = collectMentionEmailsFromPlainText(plain);
    for (const em of emails) {
      if (byKey.has(em)) continue;
      const local = em.includes("@") ? em.split("@")[0] : em;
      const displayName = local
        ? local.replace(/[._-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
        : em;
      byKey.set(em, { email: em, displayName });
    }
  }
  return [...byKey.values()];
}

export function slugCustomer(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
}

/** Merge list row with detail template for header / rail. */
export function buildTicketDetail(ticket) {
  if (!ticket) return null;
  const base = { ...MOCK_TICKET_DETAIL, ...ticket };
  base.organization = ticket.customer ?? base.organization;
  if (ticket.id !== "DES-1842") {
    const slug = slugCustomer(ticket.customer ?? "organization");
    base.requesterEmail = `portal-requests@${slug}.example`;
    base.requesterName = "Requester";
    base.productName = ticket.productName || "Destrova Core ITSM";
    base.openedAt = "Apr 19, 2026 · 10:00";
  }
  return base;
}

/** Saved list views for narrow ticket list (workspace preview). */
export function filterTicketsByListView(view, query) {
  const q = query.trim().toLowerCase();
  let rows = [...MOCK_TICKETS];
  if (view === "mine") rows = rows.filter((t) => t.assignee === "You");
  if (view === "unassigned") rows = rows.filter((t) => !t.assignee);
  if (!q) return rows;
  return rows.filter(
    (t) =>
      t.id.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      (t.customer && t.customer.toLowerCase().includes(q)) ||
      (t.productName && t.productName.toLowerCase().includes(q)),
  );
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

export function isTicketActive(ticket) {
  const status = normalizeStatus(ticket?.status);
  return status !== "CLOSED";
}

/**
 * Closed sekmesi: bu ajana atanmış kapalı biletler.
 * @param {object} ticket
 * @param {number|string|null} [currentUserId] — assigneeId ile eşleşme (tercih edilir)
 */
export function isTicketHistory(ticket, currentUserId = null) {
  const status = normalizeStatus(ticket?.status);
  if (status !== "CLOSED") return false;
  if (currentUserId != null && ticket?.assigneeId != null) {
    return Number(ticket.assigneeId) === Number(currentUserId);
  }
  return ticket?.assignee === "You";
}

export function isTicketUnassigned(ticket) {
  const status = normalizeStatus(ticket?.status);

  const hasAssignee =
    ticket?.assigneeId != null ||
    ticket?.assignee?.id != null ||
    (
      ticket?.assignee != null &&
      String(ticket.assignee).trim() !== "" &&
      String(ticket.assignee).trim().toLowerCase() !== "unassigned"
    );

    const ACTIVE_STATUSES = ["NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED"];
    return ACTIVE_STATUSES.includes(status) && !hasAssignee;
}
export function getActivityTabCounts() {
  const active = MOCK_TICKETS.filter(isTicketActive).length;
  const history = MOCK_TICKETS.filter(isTicketHistory).length;
  return { active, history };
}
