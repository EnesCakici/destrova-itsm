import { useEffect, useMemo, useState } from "react";
import {
  CUSTOMER_PRIORITY_PILL_BASE,
  CUSTOMER_STATUS_PILL_BASE,
  getCustomerPriorityBadgeClass,
  getCustomerStatusAccent,
  getCustomerStatusBadgeClass,
  getCustomerStatusLabel,
  getCustomerNextStepsModel,
  getCustomerSystemTimelineTargetStatus,
  getCustomerTimelineStepLabelClass,
  getCustomerTimelineStepMarkerClass,
  formatCustomerSystemTimelineMessage,
  customerTimelineShowsTeamReviewing,
  pruneRedundantCustomerSystemTimelineEntries,
  shouldHideCustomerSystemTimelineMessage,
} from "../utils/customerStatusDisplay";
import DestrovaComposer from "../../shared/DestrovaComposer";
import { htmlToPlainText } from "../../shared/htmlPlainText";
import { customerAttachmentConstants } from "../../../../utils/customerAttachmentValidation";
import { looksLikeStoredRichHtml, safeRichHtmlForDisplay } from "../../shared/storedRichHtml";
import { isEndUserAuthorType, isSystemAuthorType } from "../../shared/commentAuthorType";
import { customerCloseTicket } from "../../../../services/api";

/*
 * TICKET DETAIL REHBER:
 * - Sayfa iki kolon: sol (conversation + reply), sağ (summary/trust panelleri).
 * - Hero üst kart: ticket kimliği + status + priority + meta chipler.
 * - Timeline kaynağı: `timeline` useMemo (sadece customer-safe içerik).
 * - Reply composer: DestrovaComposer (TipTap) + attach + send.
 * - Sağ paneller:
 *   - NextStepsPanel: süreç/progress
 *   - SummaryPanel: ticket meta
 *   - AttachmentsPanel: dosyalar
 *   - TrustPanel: güven mesajı
 */

/* ── Priority tone map ──────────────────────────────────────────────────────── */
const PRIORITY_TONE = {
  HIGH: {
    chip: "bg-rose-50 text-rose-800 ring-rose-200/70",
    dot: "bg-rose-500",
    label: "High",
  },
  MEDIUM: {
    chip: "bg-amber-50 text-amber-900 ring-amber-200/70",
    dot: "bg-amber-500",
    label: "Medium",
  },
  LOW: {
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200/70",
    dot: "bg-emerald-500",
    label: "Low",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────────── */
function IconArrowLeft(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path fillRule="evenodd" d="M12.78 4.72a.75.75 0 0 1 0 1.06L7.56 11l5.22 5.22a.75.75 0 1 1-1.06 1.06l-5.75-5.75a.75.75 0 0 1 0-1.06l5.75-5.75a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  );
}
function IconDownload(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M10 2a.75.75 0 0 1 .75.75v7.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V2.75A.75.75 0 0 1 10 2Z" />
      <path d="M3.5 13.75a.75.75 0 0 1 .75.75V16c0 .55.45 1 1 1h9.5c.55 0 1-.45 1-1v-1.5a.75.75 0 0 1 1.5 0V16A2.5 2.5 0 0 1 14.75 18.5H5.25A2.5 2.5 0 0 1 2.75 16v-1.5a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}
function IconFile(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IconPaperclip(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57a4 4 0 0 1 5.66 5.66l-8.58 8.57a2 2 0 1 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
function IconCheck(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.07 7.13a1 1 0 0 1-1.42 0l-3.53-3.57a1 1 0 1 1 1.42-1.407l2.82 2.852 6.36-6.413a1 1 0 0 1 1.414-.006Z" clipRule="evenodd" />
    </svg>
  );
}
function IconShield(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconPaperPlane(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

/* ── Date formatters ────────────────────────────────────────────────────────── */
function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function formatRelative(value) {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec  = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  return `${Math.floor(day / 7)}w ago`;
}
function initialsFor(authorType, customerName = "You") {
  if (isEndUserAuthorType(authorType)) return (customerName || "You").slice(0, 1).toUpperCase();
  return "S"; // Support
}

/** Conversation thread — role-based chrome (visual only). */
function conversationMessageProseClass(message) {
  return [
    looksLikeStoredRichHtml(message) ? "whitespace-normal [&_p]:my-0.5 [&_ul]:my-1 [&_ol]:my-1" : "whitespace-pre-wrap",
    "text-[13px] leading-snug",
  ].join(" ");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMessageToHtml(text) {
  if (!text) return "";
  if (looksLikeStoredRichHtml(text)) {
    return safeRichHtmlForDisplay(text);
  }
  const escaped = escapeHtml(text);
  const lines = escaped.split("\n");
  const hasList = lines.some((line) => line.trimStart().startsWith("- "));

  const inline = (input) =>
    input
      .replace(/`([^`]+?)`/g, "<code class='rounded bg-destrova-surfaceMuted px-1.5 py-0.5 font-mono text-[12px]'>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<span class='underline'>$1</span>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/==(.+?)==/g, "<span class='font-semibold text-destrova-primary'>$1</span>");

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

/* ── Side panel sub-components ──────────────────────────────────────────────── */

function MetaChip({ label, value, tone = "neutral" }) {
  const toneClass =
    tone === "accent"
      ? "bg-destrova-primarySubtle text-destrova-primary ring-indigo-200/60"
      : "bg-white text-destrova-inkMuted ring-destrova-border";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium ring-1 ring-inset ${toneClass}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-destrova-inkSoft">
        {label}
      </span>
      <span className="text-destrova-ink">{value}</span>
    </span>
  );
}

function NextStepsPanel({ status, assigneeId }) {
  const { steps, percent: progress } = getCustomerNextStepsModel(status, { assigneeId });
  const accent = getCustomerStatusAccent(status);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d4d3e6] bg-gradient-to-b from-[#f9f8fe]/95 via-[#f3f1fa]/92 to-[#eceaf6]/88 shadow-destrova-sm backdrop-blur-[1px] transition-shadow duration-150 hover:shadow-destrova">
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-destrova-inkSoft">
            What happens next
          </p>
          <span className="text-[11px] font-semibold tabular-nums text-destrova-primary">
            {progress}%
          </span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-destrova-surfaceMuted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: accent }}
          />
        </div>
      </div>
      <ol className="divide-y divide-destrova-borderMuted px-5 pb-4">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 py-2">
            <span
              aria-hidden
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${getCustomerTimelineStepMarkerClass(step.id, { done: step.done, active: step.active })}`}
            >
              {step.done ? (
                <IconCheck className="h-2.5 w-2.5" />
              ) : (
                <span className="h-1 w-1 rounded-full bg-current" />
              )}
            </span>
            <span
              className={getCustomerTimelineStepLabelClass({ done: step.done, active: step.active })}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SummaryPanel({ ticket, priorityLabel, priorityDot }) {
  const rows = [
    { label: "Ticket ID",    value: `#${ticket?.id ?? "—"}`,                                   mono: true },
    { label: "Product",      value: ticket?.product?.name || "General" },
    {
      label: "Priority",
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${priorityDot}`} aria-hidden />
          {priorityLabel}
        </span>
      ),
    },
    { label: "Opened",       value: formatDateTime(ticket?.createdAt) },
    { label: "Last update",  value: formatDateTime(ticket?.updatedAt || ticket?.createdAt) },
    ticket?.slaDueDate ? { label: "Expected by", value: formatDateTime(ticket.slaDueDate) } : null,
  ].filter(Boolean);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d4d3e6] bg-gradient-to-b from-[#f9f8fe]/95 via-[#f3f1fa]/92 to-[#eceaf6]/88 shadow-destrova-sm backdrop-blur-[1px] transition-shadow duration-150 hover:shadow-destrova">
      <div className="border-b border-destrova-borderMuted px-5 py-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-destrova-inkSoft">
          Request summary
        </p>
      </div>
      <dl className="divide-y divide-destrova-borderMuted px-5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <dt className="text-[12px] text-destrova-inkSoft">{row.label}</dt>
            <dd className={`text-right text-[12.5px] font-semibold text-destrova-ink ${row.mono ? "font-mono tabular-nums" : ""}`}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AttachmentsPanel({ attachments, onDownload }) {
  if (!attachments || attachments.length === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-[#d4d3e6] bg-gradient-to-b from-[#f9f8fe]/95 via-[#f3f1fa]/92 to-[#eceaf6]/88 p-5 shadow-destrova-sm backdrop-blur-[1px]">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-destrova-inkSoft">
          Attachments
        </p>
        <p className="mt-2.5 text-[12.5px] text-destrova-inkSoft">
          No files have been shared on this request yet.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d4d3e6] bg-gradient-to-b from-[#f9f8fe]/95 via-[#f3f1fa]/92 to-[#eceaf6]/88 shadow-destrova-sm backdrop-blur-[1px]">
      <div className="flex items-center justify-between border-b border-destrova-borderMuted px-5 py-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-destrova-inkSoft">
          Attachments
        </p>
        <span className="text-[11px] font-semibold tabular-nums text-destrova-primary">
          {attachments.length}
        </span>
      </div>
      <ul className="divide-y divide-destrova-borderMuted px-5 py-2">
        {attachments.map((att) => (
          <li
            key={att.id}
            className="group flex items-center justify-between gap-2 py-2 text-[12.5px] transition-colors"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-destrova-surfaceMuted text-destrova-inkSoft ring-1 ring-inset ring-destrova-border">
                <IconFile className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 truncate font-medium text-destrova-ink" title={att.fileName || att.name}>
                {att.fileName || att.name || `Attachment #${att.id}`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onDownload?.(att)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-destrova-inkSoft transition-all duration-150 hover:bg-destrova-primarySubtle hover:text-destrova-primary"
              title="Download"
            >
              <IconDownload className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrustPanel() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d4d3e6] bg-gradient-to-b from-[#f9f8fe]/95 via-[#f3f1fa]/92 to-[#eceaf6]/88 shadow-destrova-sm backdrop-blur-[1px]">
      <div className="flex items-center gap-3 border-b border-destrova-borderMuted px-5 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destrova-primarySubtle text-destrova-primary ring-1 ring-inset ring-indigo-200/60">
          <IconShield className="h-3.5 w-3.5" />
        </span>
        <p className="text-[12.5px] font-semibold text-destrova-ink">Your request is secure</p>
      </div>
      <p className="px-5 py-3.5 text-[12px] leading-relaxed text-destrova-inkSoft">
        Only you and our support team can see this conversation. You&apos;ll be notified by email when we respond.
      </p>
    </section>
  );
}

/* ── Main view ──────────────────────────────────────────────────────────────── */

export default function CustomerTicketDetailView({
  ticket,
  attachments,
  loading,
  error,
  onBack,
  reply,
  onReplyChange,
  replyFiles,
  onAddReplyFiles,
  onRemoveReplyFile,
  onSubmitReply,
  isSendingReply,
  replyUploadProgress,
  onDownloadAttachment,
  customerName,
  pageMessage,
  messageAttachmentHistory = [],
  resolutionBusy = false,
  syncState = null,
  onAcceptResolution,
  onRejectResolution,
  onRefresh,
}) {
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState("");
  /** When true, customer chose "No" and must enter a reason + Send (or Cancel). */
  const [declineStepOpen, setDeclineStepOpen] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState("SOLVED");
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError, setCloseError] = useState(null);
  const [ticketAfterClose, setTicketAfterClose] = useState(null);

  const displaySource = ticketAfterClose ?? ticket;
  const status        = displaySource?.status || "NEW";
  const statusLabel   = getCustomerStatusLabel(status);
  const statusBadgeClass = getCustomerStatusBadgeClass(status);
  const statusAccent  = getCustomerStatusAccent(status);
  const priority      = displaySource?.priority || ticket?.priority || "MEDIUM";
  const priorityTone  = PRIORITY_TONE[priority] || PRIORITY_TONE.MEDIUM;

  useEffect(() => {
    setDeclineReason("");
    setDeclineError("");
    setDeclineStepOpen(false);
    setShowCloseModal(false);
    setCloseReason("SOLVED");
    setCloseError(null);
    setTicketAfterClose(null);
  }, [ticket?.id]);

  const handleCustomerClose = async () => {
    if (!ticket?.id) return;
    setCloseLoading(true);
    setCloseError(null);
    try {
      const updated = await customerCloseTicket(ticket.id, closeReason);
      setTicketAfterClose(updated);
      setShowCloseModal(false);
      onRefresh?.(updated);
    } catch (err) {
      setCloseError(err?.response?.data?.message || "Could not close the request.");
    } finally {
      setCloseLoading(false);
    }
  };

  /* Customer-visible timeline: original message + non-internal comments (incl. system status lines) */
  const timeline = useMemo(() => {
    const t = ticketAfterClose ?? ticket;
    if (!t) return [];
    const entries = [];

    entries.push({
      kind: "MESSAGE",
      authorType: "CUSTOMER",
      authorName: t.creatorName || customerName || "You",
      message: t.description || "(No description provided)",
      createdAt: t.createdAt,
      isOriginal: true,
    });

    (t.comments || [])
      .filter((c) => !c.isInternal)
      .forEach((c) => {
        if (isSystemAuthorType(c.authorType)) {
          if (shouldHideCustomerSystemTimelineMessage(c.message)) return;
          entries.push({
            kind: "SYSTEM",
            message: c.message,
            displayMessage: formatCustomerSystemTimelineMessage(c.message),
            targetStatus: getCustomerSystemTimelineTargetStatus(c.message),
            createdAt: c.createdAt,
          });
          return;
        }
        entries.push({
          kind: "MESSAGE",
          authorType: c.authorType,
          authorName: c.authorName || (isEndUserAuthorType(c.authorType) ? "You" : "Support team"),
          message: c.message,
          createdAt: c.createdAt,
        });
      });

    const status = t.status || "NEW";
    const mayShowReviewingFallback =
      t.assigneeId != null &&
      (status === "IN_PROGRESS" || status === "WAITING_FOR_CUSTOMER") &&
      !customerTimelineShowsTeamReviewing(entries);

    if (mayShowReviewingFallback) {
      const fallbackAt = new Date(t.createdAt || Date.now());
      fallbackAt.setSeconds(fallbackAt.getSeconds() + 1);
      entries.push({
        kind: "SYSTEM",
        message: "",
        displayMessage: getCustomerStatusLabel("IN_PROGRESS"),
        targetStatus: "IN_PROGRESS",
        createdAt: fallbackAt.toISOString(),
        synthetic: true,
      });
    }

    const sorted = entries.sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    return pruneRedundantCustomerSystemTimelineEntries(sorted, status);
  }, [ticket, ticketAfterClose, customerName]);

  const timelineAttachmentMap = useMemo(() => {
    if (!timeline.length || !messageAttachmentHistory.length) return {};
    const usedAttachmentIds = new Set();
    const map = {};

    const resolveByFileName = (fileName) => {
      const normalized = String(fileName || "").trim().toLowerCase();
      if (!normalized) return null;
      const found = (attachments || []).find((att) => {
        const attName = String(att.fileName || att.name || "").trim().toLowerCase();
        return attName === normalized && !usedAttachmentIds.has(att.id);
      });
      if (found) usedAttachmentIds.add(found.id);
      return found || null;
    };

    for (const historyItem of messageAttachmentHistory) {
      const targetIdx = timeline.findIndex((entry) => {
        if (entry.kind !== "MESSAGE" || !isEndUserAuthorType(entry.authorType) || entry.isOriginal) return false;
        const sameText = (entry.message || "").trim() === (historyItem.message || "").trim();
        if (!sameText) return false;
        const entryTime = new Date(entry.createdAt || 0).getTime();
        const histTime = new Date(historyItem.createdAt || 0).getTime();
        if (Number.isNaN(entryTime) || Number.isNaN(histTime)) return sameText;
        return Math.abs(entryTime - histTime) < 10 * 60 * 1000;
      });

      if (targetIdx < 0) continue;
      const resolved = (historyItem.fileNames || [])
        .map((name) => resolveByFileName(name))
        .filter(Boolean);
      if (resolved.length > 0) {
        map[targetIdx] = [...(map[targetIdx] || []), ...resolved];
      }
    }
    return map;
  }, [timeline, messageAttachmentHistory, attachments]);

  const isReplyEmpty = useMemo(() => {
    return !htmlToPlainText(reply);
  }, [reply]);

  /* Loading state */
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 py-10">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-destrova-border border-t-destrova-primary" />
          <p className="mt-3 text-sm text-destrova-inkSoft">Loading your request…</p>
        </div>
      </div>
    );
  }

  /* Error state */
  if (error || !ticket) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 py-10">
        <div className="max-w-sm rounded-2xl border border-destrova-border bg-white p-6 text-center shadow-destrova-sm">
          <p className="text-sm font-semibold text-destrova-ink">Unable to load this request</p>
          <p className="mt-1 text-xs text-destrova-inkSoft">{error || "The request could not be found."}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-xs font-semibold text-destrova-primary shadow-destrova-sm ring-1 ring-inset ring-indigo-200/60 transition-colors hover:bg-destrova-primarySubtle"
          >
            <IconArrowLeft className="h-3 w-3" />
            Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  const viewTicket = ticketAfterClose ?? ticket;
  const isClosed = viewTicket.status === "CLOSED";
  const isResolvedPendingCustomer = status === "RESOLVED";
  const canCustomerClose =
    viewTicket.status !== "CLOSED" && viewTicket.status !== "RESOLVED";

  return (
    // Sayfa genişliği ve kenar boşlukları burada
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-b from-[#f3f2fb] via-[#f5f6fc] to-[#00000] px-6 py-8 md:px-10 md:py-10">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5">

        {/* ── Back navigation ────────────────────────────────────────────────── */}
        <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destrova-border bg-white/80 px-2.5 text-[12px] font-semibold text-destrova-inkMuted shadow-destrova-sm transition-all duration-150 hover:border-destrova-borderStrong hover:bg-white hover:text-destrova-ink hover:-translate-y-px"
          >
            <IconArrowLeft className="h-3 w-3" />
            Back to My Tickets
          </button>
        </div>

        {/* ── Hero header card ────────────────────────────────────────────────── */}
        <section
          // Üst hero kart: en güçlü kimlik ve durum bilgisi yüzeyi
          className="relative animate-slide-up-fade overflow-hidden rounded-2xl border border-[#d2d1e4] bg-gradient-to-b from-[#faf9ff]/96 via-[#f3f1fa]/92 to-[#eceaf6]/88 shadow-destrova-card backdrop-blur-[1px]"
          style={{ animationDelay: "40ms" }}
        >
          {/* Status accent stripe */}
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-1"
            style={{ backgroundColor: statusAccent }}
          />

          <div className="relative flex flex-col gap-4 px-7 py-6 md:px-8 md:py-7">
            {/* Badges row + close action */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-destrova-surfaceMuted px-2 py-0.5 font-mono text-[11.5px] font-semibold tabular-nums text-destrova-inkMuted ring-1 ring-inset ring-destrova-borderMuted">
                  #{ticket.id}
                </span>
                <span className={`${CUSTOMER_STATUS_PILL_BASE} ${statusBadgeClass}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusAccent }} aria-hidden />
                  {statusLabel}
                </span>
                {syncState === "syncing" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200/80">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" aria-hidden />
                    Syncing…
                  </span>
                ) : null}
                {syncState === "timeout" ? (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200/80">
                    Sync pending
                  </span>
                ) : null}
                <span className={`${CUSTOMER_PRIORITY_PILL_BASE} ${getCustomerPriorityBadgeClass(priority)}`}>
                  <span className={`mr-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${priorityTone.dot}`} aria-hidden />
                  <span className="normal-case tracking-normal">{priorityTone.label}</span>
                </span>
              </div>
              {canCustomerClose ? (
                <button
                  type="button"
                  onClick={() => setShowCloseModal(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Close Request
                </button>
              ) : null}
            </div>

            {/* Title */}
            <h1 className="text-[22px] font-bold leading-[1.2] tracking-[-0.01em] text-destrova-ink md:text-[26px]">
              {ticket.title || "Untitled request"}
            </h1>

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <MetaChip label="Product" value={ticket.product?.name || "General"} />
              <MetaChip label="Opened"  value={formatDateTime(ticket.createdAt)} />
              <MetaChip
                label="Last update"
                value={formatRelative(ticket.updatedAt || ticket.createdAt) || formatDateTime(ticket.updatedAt)}
                tone="accent"
              />
            </div>
            {status === "IN_PROGRESS" &&
            ticket.customerRejectionNote &&
            String(ticket.customerRejectionNote).trim() !== "" ? (
              <p className="mt-3 max-w-2xl rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[12.5px] leading-relaxed text-amber-950">
                <span className="font-semibold">You declined the proposed resolution. </span>
                Our team is working on it using the reason you provided.
              </p>
            ) : null}
          </div>
        </section>

        {/* Page-level message */}
        {pageMessage?.text ? (
          <div
            className={`animate-fade-in rounded-xl border px-3.5 py-2.5 text-sm font-medium ${
              pageMessage.type === "error"
                ? "border-rose-200 bg-rose-50/80 text-rose-700"
                : "border-emerald-200 bg-emerald-50/80 text-emerald-800"
            }`}
          >
            {pageMessage.text}
          </div>
        ) : null}

        {/* ── Two-column body ─────────────────────────────────────────────────── */}
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* ── LEFT: conversation thread + reply composer ─────────────────── */}
          <div className="flex min-w-0 flex-col gap-4">

            {/* Thread card */}
            <section
              className="animate-slide-up-fade overflow-hidden rounded-2xl border border-[#d3d2e5] bg-gradient-to-b from-[#faf9ff]/96 via-[#f3f1fa]/92 to-[#eceaf6]/88 shadow-destrova-sm backdrop-blur-[1px]"
              style={{ animationDelay: "120ms" }}
            >
              <header className="flex items-center justify-between gap-3 border-b border-destrova-borderMuted bg-destrova-surfaceRaised px-4 py-2.5 md:px-5">
                <p className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-destrova-inkSoft">
                  Conversation
                </p>
                <span className="shrink-0 text-[10.5px] font-semibold tabular-nums text-destrova-inkSoft">
                  {timeline.length} {timeline.length === 1 ? "entry" : "entries"}
                </span>
              </header>

              <div className="relative max-h-[min(60vh,32rem)] overflow-y-auto px-3 py-2 md:px-4">
                <div
                  className="pointer-events-none absolute bottom-2 left-[calc(0.75rem+0.875rem)] top-2 w-px -translate-x-1/2 bg-gradient-to-b from-slate-200 via-violet-200/80 to-slate-200 md:left-[calc(1rem+0.875rem)]"
                  aria-hidden
                />
                <div className="relative space-y-1">
                  {timeline.map((entry, idx) => {
                    if (entry.kind === "SYSTEM") {
                      const statusAccent =
                        getCustomerStatusAccent(entry.targetStatus) || "#6D28D9";
                      return (
                        <div key={idx} className="relative flex items-center gap-2 py-0.5">
                          <span
                            className="relative z-[1] flex h-6 w-7 shrink-0 items-center justify-center self-center"
                            aria-hidden
                          >
                            <span
                              className="h-2 w-2 shrink-0 rounded-full ring-2 ring-white"
                              style={{ backgroundColor: statusAccent, boxShadow: `0 0 0 2px ${statusAccent}22` }}
                            />
                          </span>
                          <p className="min-w-0 flex-1 rounded-md border border-violet-200/55 bg-violet-50/45 px-2 py-1 text-[11px] leading-[1.35] text-violet-950/85">
                            <span className="font-semibold text-violet-700">Status</span>
                            <span className="text-violet-800/75"> · </span>
                            <span>{entry.displayMessage}</span>
                            <span
                              className="ml-1 whitespace-nowrap text-[10px] font-medium text-violet-600/65"
                              title={formatDateTime(entry.createdAt)}
                            >
                              · {formatRelative(entry.createdAt) || formatDateTime(entry.createdAt)}
                            </span>
                          </p>
                        </div>
                      );
                    }

                    const isCustomer = isEndUserAuthorType(entry.authorType);
                    return (
                      <article
                        key={idx}
                        className={[
                          "relative flex gap-2 rounded-lg py-1.5 pr-1",
                          isCustomer ? "bg-sky-50/25" : "bg-violet-50/20",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden
                          className={[
                            "relative z-[1] flex w-7 shrink-0 justify-center",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ring-1 ring-inset",
                              isCustomer
                                ? "bg-sky-100 text-sky-800 ring-sky-200/90"
                                : "bg-violet-600 text-white ring-violet-300/40",
                            ].join(" ")}
                          >
                            {initialsFor(entry.authorType, customerName)}
                          </span>
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p
                              className={[
                                "text-[12.5px] font-semibold",
                                isCustomer ? "text-sky-900" : "text-violet-900",
                              ].join(" ")}
                            >
                              {isCustomer ? entry.authorName || "You" : "Support team"}
                            </p>
                            {!isCustomer ? (
                              <span className="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.06em] text-violet-800 ring-1 ring-inset ring-violet-200/80">
                                Agent
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-sky-100 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.06em] text-sky-800 ring-1 ring-inset ring-sky-200/80">
                                You
                              </span>
                            )}
                            {entry.isOriginal ? (
                              <span className="inline-flex items-center rounded-full bg-white/80 px-1.5 py-px text-[9.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/90">
                                Original request
                              </span>
                            ) : null}
                            <span
                              className="ml-auto text-[10.5px] text-destrova-inkSoft"
                              title={formatDateTime(entry.createdAt)}
                            >
                              {formatRelative(entry.createdAt) || formatDateTime(entry.createdAt)}
                            </span>
                          </div>

                          <div
                            className={[
                              "mt-1 rounded-lg border-l-[3px] px-2.5 py-2 ring-1 ring-inset",
                              conversationMessageProseClass(entry.message),
                              isCustomer
                                ? "border-sky-500 bg-white text-slate-800 ring-sky-200/45"
                                : "border-violet-600 bg-white/90 text-slate-800 ring-violet-200/40",
                            ].join(" ")}
                            dangerouslySetInnerHTML={{ __html: formatMessageToHtml(entry.message) }}
                          />

                          {timelineAttachmentMap[idx]?.length ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {timelineAttachmentMap[idx].map((att) => (
                                <button
                                  key={`msg-att-${idx}-${att.id}`}
                                  type="button"
                                  onClick={() => onDownloadAttachment?.(att)}
                                  className={[
                                    "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold shadow-sm transition-colors",
                                    isCustomer
                                      ? "border-sky-200/80 bg-sky-50 text-sky-900 hover:bg-sky-100"
                                      : "border-violet-200/80 bg-violet-50 text-violet-900 hover:bg-violet-100",
                                  ].join(" ")}
                                >
                                  <IconFile className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{att.fileName || att.name}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            {isResolvedPendingCustomer && onAcceptResolution && onRejectResolution ? (
              <section
                className="animate-slide-up-fade overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/95 to-white shadow-destrova-sm"
                style={{ animationDelay: "140ms" }}
              >
                <div className="border-b border-emerald-100/90 bg-white/60 px-5 py-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-800/90">Your decision</p>
                  <p className="mt-1 text-sm font-semibold text-destrova-ink">Was this resolved?</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-destrova-inkMuted">
                    Please confirm whether the solution fixed your issue.
                  </p>
                </div>
                <div className="flex flex-col gap-3 px-5 py-4">
                  {declineStepOpen ? (
                    <>
                      <div>
                        <label
                          htmlFor="decline-resolution-reason"
                          className="text-[12px] font-semibold text-destrova-ink"
                        >
                          Tell us what still needs help
                          <span className="text-rose-600"> *</span>
                        </label>
                        <textarea
                          id="decline-resolution-reason"
                          rows={4}
                          value={declineReason}
                          onChange={(e) => {
                            setDeclineReason(e.target.value);
                            if (declineError) setDeclineError("");
                          }}
                          disabled={resolutionBusy}
                          placeholder="Describe what still needs to be fixed so our team can help."
                          className="mt-1.5 w-full resize-y rounded-xl border border-destrova-border bg-white px-3 py-2 text-[13px] text-destrova-ink shadow-destrova-sm outline-none ring-0 transition placeholder:text-destrova-inkFaint focus:border-destrova-primary/50 focus:ring-2 focus:ring-destrova-primary/20 disabled:opacity-50"
                        />
                        {declineError ? <p className="mt-1 text-[12px] font-medium text-rose-600">{declineError}</p> : null}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDeclineStepOpen(false);
                            setDeclineReason("");
                            setDeclineError("");
                          }}
                          disabled={resolutionBusy}
                          className="inline-flex h-10 min-h-[2.5rem] items-center justify-center rounded-xl border border-destrova-border bg-white px-4 text-sm font-semibold text-destrova-inkMuted shadow-destrova-sm transition hover:bg-destrova-surfaceMuted disabled:opacity-50 sm:min-w-[7.5rem]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const note = declineReason.trim();
                            if (!note) {
                              setDeclineError("Please add a short explanation.");
                              return;
                            }
                            setDeclineError("");
                            await onRejectResolution?.(note);
                          }}
                          disabled={resolutionBusy}
                          className="inline-flex h-10 min-h-[2.5rem] items-center justify-center rounded-xl bg-destrova-ink px-4 text-sm font-bold text-white shadow-sm transition hover:bg-destrova-ink/90 disabled:opacity-50 sm:min-w-[7.5rem]"
                        >
                          {resolutionBusy ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          ) : (
                            "Send rejection"
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                      <button
                        type="button"
                        onClick={() => onAcceptResolution?.()}
                        disabled={resolutionBusy}
                        className="inline-flex h-10 min-h-[2.5rem] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {resolutionBusy ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <IconCheck className="h-4 w-4" />
                        )}
                        Yes, close ticket
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeclineStepOpen(true);
                          setDeclineError("");
                        }}
                        disabled={resolutionBusy}
                        className="inline-flex h-10 min-h-[2.5rem] flex-1 items-center justify-center rounded-xl border border-destrova-border bg-white px-4 text-sm font-bold text-destrova-ink shadow-destrova-sm transition hover:bg-destrova-surfaceMuted disabled:opacity-50"
                      >
                        No, I still need help
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {/* Reply composer / closed notice */}
            {isClosed ? (
              <section
                className="animate-slide-up-fade rounded-2xl border border-dashed border-destrova-borderStrong/40 bg-destrova-surfaceRaised px-5 py-4 text-center"
                style={{ animationDelay: "160ms" }}
              >
                <p className="text-[12.5px] text-destrova-inkSoft">
                  This request has been closed. If you need further help, please open a new request.
                </p>
              </section>
            ) : isResolvedPendingCustomer ? null : (
              <section
                className="animate-slide-up-fade space-y-3 rounded-2xl border border-[#d3d2e5] bg-gradient-to-b from-[#faf9ff]/96 via-[#f3f1fa]/92 to-[#eceaf6]/88 p-4 shadow-destrova-sm backdrop-blur-[1px] md:p-5"
                style={{ animationDelay: "160ms" }}
              >
                <p className="text-[12px] font-semibold text-destrova-ink">Reply to support</p>

                <DestrovaComposer
                  editorName="reply"
                  editorValue={reply}
                  onEditorChange={(e) => onReplyChange(e.target.value)}
                  editorPlaceholder="Write your message…"
                  disabled={isSendingReply}
                />

                <div className="space-y-3">

                  {replyFiles && replyFiles.length > 0 ? (
                    <div className="rounded-xl border border-destrova-border bg-white px-3.5 py-2.5 shadow-destrova-sm">
                      <ul className="flex flex-wrap gap-1.5">
                        {replyFiles.map((file, index) => (
                          <li key={`${file.name}-${index}`}>
                            <button
                              type="button"
                              onClick={() => onRemoveReplyFile?.(index)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-[#bfc8d8] bg-[#eef2f8] px-2.5 py-1 text-[11.5px] font-semibold text-[#3e4f6c] shadow-sm transition-colors hover:bg-[#e2e9f4]"
                              title="Click to remove attachment"
                            >
                              <IconFile className="h-3.5 w-3.5" />
                              <span className="max-w-[12rem] truncate">{file.name}</span>
                              <span className="text-[10px] text-[#5d6e8c]">{Math.round(file.size / 1024)} KB</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Upload progress */}
                  {isSendingReply && replyFiles && replyFiles.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between text-[11.5px] text-destrova-inkSoft">
                        <span>Uploading attachments…</span>
                        <span className="tabular-nums">{replyUploadProgress || 0}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-destrova-surfaceMuted">
                        <div
                          className="h-full rounded-full bg-destrova-brand transition-all duration-300"
                          style={{ width: `${replyUploadProgress || 0}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col-reverse items-stretch justify-between gap-2 border-t border-destrova-borderMuted/80 pt-3 sm:flex-row sm:items-center">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 self-start rounded-lg border border-destrova-border bg-white px-3 text-[12.5px] font-medium text-destrova-inkMuted shadow-destrova-sm transition-all duration-150 hover:border-destrova-borderStrong hover:bg-destrova-surfaceMuted hover:text-destrova-ink">
                      <IconPaperclip className="h-3.5 w-3.5" />
                      Attach files
                      <input
                        type="file"
                        multiple
                        accept={customerAttachmentConstants.acceptInput}
                        className="hidden"
                        onChange={(e) => {
                          onAddReplyFiles?.(Array.from(e.target.files || []));
                          e.target.value = "";
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={onSubmitReply}
                      disabled={isSendingReply || isReplyEmpty}
                      className={[
                        "destrova-submit-request-btn destrova-focus-ring shrink-0 self-end sm:self-auto",
                        isSendingReply ? "destrova-submit-request-btn--loading" : "",
                      ].join(" ")}
                    >
                      {isSendingReply ? (
                        <>
                          <span
                            className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/35 border-t-white"
                            aria-hidden
                          />
                          <span>Sending…</span>
                        </>
                      ) : (
                        <>
                          <span className="destrova-submit-request-btn__icon">
                            <IconPaperPlane />
                          </span>
                          <span className="destrova-submit-request-btn__label">Send reply</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT: trust + info rail ────────────────────────────────────── */}
          <aside
            className="flex animate-slide-up-fade min-w-0 flex-col gap-4"
            style={{ animationDelay: "200ms" }}
          >
            <NextStepsPanel status={status} assigneeId={ticket?.assigneeId} />
            <SummaryPanel ticket={ticket} priorityLabel={priorityTone.label} priorityDot={priorityTone.dot} />
            <AttachmentsPanel attachments={attachments} onDownload={onDownloadAttachment} />
            <TrustPanel />
          </aside>
        </div>
      </div>

      {showCloseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-[15px] font-semibold text-slate-900">Close this request?</h3>
            <p className="mb-4 text-[13px] text-slate-500">Please let us know why you&apos;re closing it.</p>
            <select
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="SOLVED">My issue was resolved</option>
              <option value="NO_RESPONSE">I no longer need support</option>
              <option value="DUPLICATE">I submitted this by mistake</option>
            </select>
            {closeError ? <p className="mb-3 text-[12px] text-red-600">{closeError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCloseModal(false);
                  setCloseError(null);
                }}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCustomerClose}
                disabled={closeLoading}
                className="rounded-lg bg-slate-800 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {closeLoading ? "Closing..." : "Confirm Close"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
