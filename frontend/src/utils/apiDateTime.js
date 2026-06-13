/**
 * Parse timestamps from the Spring Boot API.
 * `LocalDateTime` JSON has no timezone (e.g. "2026-06-13T16:06:00"); in Docker this is UTC wall clock.
 */
export function parseApiDateTimeMs(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  const s = String(value).trim();
  if (!s) return null;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(s)) {
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? null : ms;
  }
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const ms = Date.parse(`${iso}Z`);
  return Number.isNaN(ms) ? null : ms;
}

/** @returns {Date|null} */
export function parseApiDateTime(value) {
  const ms = parseApiDateTimeMs(value);
  return ms == null ? null : new Date(ms);
}
