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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Prose classes for rendered conversation bodies (rich HTML vs plain/markdown). */
export function messageProseClass(text) {
  return [
    looksLikeStoredRichHtml(text) ? "whitespace-normal [&_p]:my-0.5 [&_ul]:my-1 [&_ol]:my-1" : "whitespace-pre-wrap",
    "text-sm leading-relaxed",
  ].join(" ");
}

/** Rich HTML, legacy markdown-ish plain text, or escaped plain text → safe display HTML. */
export function formatMessageToHtml(text) {
  if (!text) return "";
  if (looksLikeStoredRichHtml(text)) {
    return safeRichHtmlForDisplay(text);
  }
  const escaped = escapeHtml(text);
  const lines = escaped.split("\n");
  const hasList = lines.some((line) => line.trimStart().startsWith("- "));

  const inline = (input) =>
    input
      .replace(/`([^`]+?)`/g, "<code class='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px]'>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<span class='underline'>$1</span>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/==(.+?)==/g, "<span class='font-semibold text-blue-700'>$1</span>");

  if (!hasList) {
    return inline(escaped).replace(/\n/g, "<br/>");
  }

  let html = "";
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("- ")) {
      if (!inList) {
        html += "<ul class='my-1 list-disc space-y-1 pl-5'>";
        inList = true;
      }
      html += `<li>${inline(trimmed.slice(2))}</li>`;
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      if (trimmed.length > 0) html += `<p>${inline(trimmed)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}
