/** Plain text from HTML (validation, counts). Preserves line breaks between block nodes. */
export function htmlToPlainText(html) {
  if (!html) return "";
  if (typeof window === "undefined") {
    return String(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.innerText || temp.textContent || "").trim();
}
