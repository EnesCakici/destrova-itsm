import { useTranslation } from "react-i18next";
import { parseApiDateTime, parseApiDateTimeMs } from "../utils/apiDateTime.js";

function resolveIntlLocale(language) {
  const base = (language || "en").split("-")[0].toLowerCase();
  if (base === "tr") return "tr-TR";
  return "en-US";
}

/**
 * Locale-aware date, number and relative-time formatter.
 * Components should use this hook instead of calling Intl directly.
 */
export function useFormatter() {
  const { i18n, t } = useTranslation("common");
  const intlLocale = resolveIntlLocale(i18n.language);

  return {
    /** e.g. '15 Jan 2026' or '15 Oca 2026' */
    formatDate(date, options = { dateStyle: "medium" }) {
      if (!date) return "";
      const parsed = parseApiDateTime(date);
      if (!parsed) return "";
      return new Intl.DateTimeFormat(intlLocale, options).format(parsed);
    },

    formatDateTime(date, options = { dateStyle: "medium", timeStyle: "short" }) {
      if (!date) return "";
      const parsed = parseApiDateTime(date);
      if (!parsed) return "";
      return new Intl.DateTimeFormat(intlLocale, options).format(parsed);
    },

    /** Agent ticket header meta: e.g. '13 Haz 2026 · 19:06' / 'Jun 13, 2026 · 7:06 PM' */
    formatMetaDateTime(date) {
      if (!date) return "—";
      const parsed = parseApiDateTime(date);
      if (!parsed) return "—";
      const datePart = new Intl.DateTimeFormat(intlLocale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(parsed);
      const timePart = new Intl.DateTimeFormat(intlLocale, {
        hour: "numeric",
        minute: "2-digit",
      }).format(parsed);
      return `${datePart} · ${timePart}`;
    },

    /** Ticket list column: e.g. '13 Haz 2025, 19:30' / 'Jun 13, 2025, 7:30 PM' */
    formatTicketListDate(date) {
      if (!date) return "—";
      const parsed = parseApiDateTime(date);
      if (!parsed) return "—";
      return new Intl.DateTimeFormat(intlLocale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(parsed);
    },

    /** e.g. '2 minutes ago' / '2 dakika önce' */
    formatRelativeTime(date) {
      if (!date) return "";
      const ms = parseApiDateTimeMs(date);
      if (ms == null) return "";
      const diff = Date.now() - ms;
      if (diff < 45_000) return t("time.justNow");

      const parsed = new Date(ms);
      const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: "always" });
      const sec = Math.floor(diff / 1000);
      if (sec < 60) return rtf.format(-sec, "second");
      const min = Math.floor(sec / 60);
      if (min < 60) return rtf.format(-min, "minute");
      const hr = Math.floor(min / 60);
      if (hr < 24) return rtf.format(-hr, "hour");
      const days = Math.floor(hr / 24);
      if (days < 30) return rtf.format(-days, "day");
      return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(parsed);
    },

    formatNumber(num) {
      if (num == null) return "";
      return new Intl.NumberFormat(intlLocale).format(num);
    },
  };
}
