/** Plain text from HTML (validation, counts). Client path uses DOM for accuracy. */
export function htmlToPlainText(html) {
  if (!html) return "";
  if (typeof window === "undefined") {
    return String(html)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || temp.innerText || "").trim();
}
