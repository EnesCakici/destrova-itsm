import { MANAGER_REPORT_RANGE_IDS } from "../data/reportsConstants";

function isTurkishLocale(lang) {
  return String(lang ?? "").toLowerCase().startsWith("tr");
}

/** @param {number} hours @param {number} minutes */
function formatHoursMinutesTr(hours, minutes) {
  if (minutes <= 0) return `${hours} sa`;
  return `${hours} sa ${minutes} dk`;
}

/**
 * @param {string|number|null|undefined} value
 * @param {string} [lang]
 */
export function formatReportDurationValue(value, lang) {
  if (value == null || value === "" || value === "—") return value ?? "—";
  if (!isTurkishLocale(lang)) {
    if (typeof value === "number") return `${value}h`;
    return String(value);
  }

  if (typeof value === "number") {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return formatHoursMinutesTr(hours, minutes);
  }

  const s = String(value).trim();
  const decimalHours = s.match(/^(\d+(?:\.\d+)?)h$/i);
  if (decimalHours) {
    const totalHours = parseFloat(decimalHours[1]);
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    return formatHoursMinutesTr(hours, minutes);
  }

  const hm = s.match(/^(\d+)h\s*(\d+)m$/i);
  if (hm) {
    return formatHoursMinutesTr(Number(hm[1]), Number(hm[2]));
  }

  return s;
}

const EN_MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const EN_WEEKDAYS = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
};

const EN_MONTH_PATTERN = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";

function parseEnMonthToken(token) {
  if (!token) return null;
  const idx = EN_MONTHS[String(token).slice(0, 3).toLowerCase()];
  return idx == null ? null : idx;
}

function trMonthShort(monthIndex) {
  return new Date(2024, monthIndex, 1)
    .toLocaleDateString("tr-TR", { month: "short" })
    .replace(/\./g, "")
    .trim();
}

function trWeekdayShort(weekdayIndex) {
  const ref = new Date(2024, 0, 7 + weekdayIndex);
  return ref.toLocaleDateString("tr-TR", { weekday: "short" }).replace(/\./g, "").trim();
}

function formatTrDayMonth(day, monthIndex) {
  return `${Number(day)} ${trMonthShort(monthIndex)}`;
}

/**
 * Backend report buckets ship English labels (e.g. "3 Jun", "Mon", "Jun 3 – Jun 10").
 * @param {string} label
 * @param {string} [lang]
 */
export function formatReportChartLabel(label, lang) {
  if (!label) return "";
  if (!isTurkishLocale(lang)) return String(label);

  const s = String(label).trim();

  const weekMock = s.match(/^W(\d+)$/i);
  if (weekMock) return `Hafta ${weekMock[1]}`;

  const weekday = s.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i);
  if (weekday) {
    const idx = EN_WEEKDAYS[weekday[1].toLowerCase()];
    if (idx != null) return trWeekdayShort(idx);
  }

  let m = s.match(new RegExp(`^(\\d{1,2})\\s+(${EN_MONTH_PATTERN})\\s*[–-]\\s*(\\d{1,2})$`, "i"));
  if (m) {
    const month = parseEnMonthToken(m[2]);
    if (month != null) return `${formatTrDayMonth(m[1], month)} – ${m[3]}`;
  }

  m = s.match(new RegExp(`^(\\d{1,2})\\s+(${EN_MONTH_PATTERN})$`, "i"));
  if (m) {
    const month = parseEnMonthToken(m[2]);
    if (month != null) return formatTrDayMonth(m[1], month);
  }

  m = s.match(
    new RegExp(`^(${EN_MONTH_PATTERN})\\s+(\\d{1,2})\\s*[–-]\\s*(${EN_MONTH_PATTERN})\\s+(\\d{1,2})$`, "i"),
  );
  if (m) {
    const monthA = parseEnMonthToken(m[1]);
    const monthB = parseEnMonthToken(m[3]);
    if (monthA != null && monthB != null) {
      return `${formatTrDayMonth(m[2], monthA)} – ${formatTrDayMonth(m[4], monthB)}`;
    }
  }

  m = s.match(new RegExp(`^(${EN_MONTH_PATTERN})\\s+(\\d{1,2})$`, "i"));
  if (m) {
    const month = parseEnMonthToken(m[1]);
    if (month != null) return formatTrDayMonth(m[2], month);
  }

  return s;
}

/** @param {string} rangeId @param {(key: string) => string} tm */
export function translateReportRangeId(rangeId, tm) {
  if (MANAGER_REPORT_RANGE_IDS.includes(rangeId)) {
    return tm(`reports.ranges.${rangeId}`);
  }
  return rangeId;
}

/** @param {{ id: string, value: string, noteKey: string }} row @param {(key: string) => string} tm @param {string} [lang] */
export function translateReportHighlightRow(row, tm, lang) {
  const value = row.id === "avgResolution"
    ? formatReportDurationValue(row.value, lang)
    : row.value;
  return {
    label: tm(`reports.highlights.${row.id}`),
    value,
    note: row.noteKey ? tm(`reports.highlights.${row.noteKey}`) : "",
  };
}

/** @param {string} text @param {(key: string, opts?: object) => string} tm */
export function translateReportVolumeDelta(text, tm) {
  if (!text) return "";
  const m = String(text).match(/^([+-]?\d+)% vs prev\. period$/);
  if (m) return tm("reports.volume.deltaVsPrev", { pct: m[1] });
  return text;
}

const REPORT_AGENT_ROLE_CODES = {
  Agent: "agent",
  "Senior agent": "seniorAgent",
  "Agent · L1": "l1",
  Specialist: "specialist",
};

/** @param {string} role @param {(key: string) => string} tm */
export function translateReportAgentRole(role, tm) {
  if (!role) return "";
  const code = REPORT_AGENT_ROLE_CODES[role];
  if (code) return tm(`reports.agents.roles.${code}`);
  return role;
}
