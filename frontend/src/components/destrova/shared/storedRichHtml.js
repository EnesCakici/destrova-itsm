import DOMPurify from "dompurify";

/** Heuristic: ticket/comment body saved as TipTap-style HTML vs legacy plain text. */
export function looksLikeStoredRichHtml(text) {
  const t = String(text || "").trim();
  if (!t.startsWith("<")) return false;
  return /<\/?(p|ul|ol|li|strong|em|u|s|br|h[1-6]|div|blockquote|pre|code|span)\b/i.test(t);
}

export function safeRichHtmlForDisplay(html) {
  if (!html) return "";
  if (typeof window === "undefined") {
    return String(html)
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
