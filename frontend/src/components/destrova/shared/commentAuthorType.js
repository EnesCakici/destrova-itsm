/**
 * Backend stores CommentAuthorType as USER | AGENT (not CUSTOMER).
 * Treat legacy/custom values consistently across agent and customer UIs.
 */
export function isEndUserAuthorType(authorType) {
  const u = String(authorType || "").toUpperCase();
  return u === "USER" || u === "CUSTOMER";
}

export function isSystemAuthorType(authorType) {
  return String(authorType || "").toUpperCase() === "SYSTEM";
}
