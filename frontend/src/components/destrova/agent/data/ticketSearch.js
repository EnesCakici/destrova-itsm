/** Normalize ticket fields for global search (case-insensitive substring). */

function norm(v) {
  if (v == null) return "";
  return String(v).toLowerCase();
}

/**
 * @param {object} ticket
 * @param {string} rawQuery
 */
export function ticketMatchesGlobalSearch(ticket, rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const hay = [
    ticket.id,
    ticket.displayId,
    ticket.title,
    ticket.customer,
    ticket.requester,
    ticket.requesterName,
    ticket.email,
    ticket.requesterEmail,
    ticket.category,
    ticket.productName,
    ticket.status,
    ticket.priority,
    ticket.assignee,
  ]
    .map(norm)
    .join(" ");

  return hay.includes(q);
}
