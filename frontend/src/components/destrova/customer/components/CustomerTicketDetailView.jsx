import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormatter } from "../../../../hooks/useFormatter";
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
import { CUSTOMER_CHIP, CUSTOMER_PAGE, CUSTOMER_PANEL, CUSTOMER_TEXT } from "../customerTokens";
import { SAAS_ICON_BUTTON } from "../../shared/saasPlatformTokens";
import TicketContextBar from "../../shared/TicketContextBar";
import { SyncStateChip } from "../../shared/StatusBadge";
import DestrovaComposer from "../../shared/DestrovaComposer";
import { ComposerResizeHandle, useResizableComposerEditor } from "../../shared/composerResize.jsx";
import { htmlToPlainText } from "../../shared/htmlPlainText";
import {
  messageMatchesRejectionNote,
  messageMatchesResolutionNote,
} from "../../shared/constants/resolutionNote";
import { customerAttachmentConstants } from "../../../../utils/customerAttachmentValidation";
import { formatMessageToHtml, messageProseClass } from "../../shared/storedRichHtml";
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

/* ── Priority tone map (visual only; labels from i18n) ─────────────────────── */
const PRIORITY_TONE = {
  HIGH: { chip: "bg-rose-50 text-rose-800 ring-rose-200/70", dot: "bg-rose-500", key: "high" },
  MEDIUM: { chip: "bg-amber-50 text-amber-900 ring-amber-200/70", dot: "bg-amber-500", key: "medium" },
  LOW: { chip: "bg-emerald-50 text-emerald-800 ring-emerald-200/70", dot: "bg-emerald-500", key: "low" },
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

function initialsFor(authorType, customerName = "You") {
  if (isEndUserAuthorType(authorType)) return (customerName || "You").slice(0, 1).toUpperCase();
  return "S";
}

/** Conversation thread — role-based chrome (visual only). */
/* ── Side panel sub-components ──────────────────────────────────────────────── */

function MetaChip({ label, value, tone = "neutral" }) {
  const toneClass =
    tone === "accent"
      ? "bg-blue-50 text-blue-700 ring-blue-200/80"
      : "bg-slate-50 text-gray-600 ring-gray-200";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium ring-1 ring-inset ${toneClass}`}>
      <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${CUSTOMER_TEXT.label}`}>
        {label}
      </span>
      <span className={CUSTOMER_TEXT.body}>{value}</span>
    </span>
  );
}

function NextStepsPanel({ status, assigneeId }) {
  const { t } = useTranslation("customer");
  const { steps } = getCustomerNextStepsModel(status, { assigneeId }, t);

  return (
    <section className={CUSTOMER_PANEL.cardHover}>
      <div className={`${CUSTOMER_PANEL.header} px-5 py-3`}>
        <p className={CUSTOMER_PANEL.headerLabel}>
          {t("ticketDetail.nextSteps")}
        </p>
      </div>
      <ol className="px-5 py-3">
        {steps.map((step, index) => (
          <li key={step.id} className="relative flex items-start gap-2.5 py-1.5 first:pt-0 last:pb-0">
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={`absolute left-[7px] top-[18px] bottom-0 w-px ${
                  step.done ? "bg-blue-300/80" : "bg-slate-200"
                }`}
              />
            ) : null}
            <span
              aria-hidden
              className={`relative z-[1] mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${getCustomerTimelineStepMarkerClass(step.id, { done: step.done, active: step.active })}`}
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
  const { t } = useTranslation("customer");
  const { formatDateTime } = useFormatter();

  const rows = [
    { label: t("ticketDetail.ticketId"), value: `#${ticket?.id ?? "—"}`, mono: true },
    { label: t("ticketDetail.product"), value: ticket?.product?.name || t("ticketDetail.general") },
    {
      label: t("ticketDetail.priority"),
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${priorityDot}`} aria-hidden />
          {priorityLabel}
        </span>
      ),
    },
    { label: t("ticketDetail.opened"), value: formatDateTime(ticket?.createdAt) },
    { label: t("ticketDetail.lastUpdate"), value: formatDateTime(ticket?.updatedAt || ticket?.createdAt) },
  ].filter(Boolean);

  return (
    <section className={CUSTOMER_PANEL.cardHover}>
      <div className={`${CUSTOMER_PANEL.header} px-5 py-3`}>
        <p className={CUSTOMER_PANEL.headerLabel}>
          {t("ticketDetail.summary")}
        </p>
      </div>
      <dl className={`${CUSTOMER_PANEL.divide} px-5`}>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <dt className={`text-[12px] ${CUSTOMER_TEXT.label}`}>{row.label}</dt>
            <dd className={`text-right text-[12.5px] font-semibold ${CUSTOMER_TEXT.body} ${row.mono ? "font-mono tabular-nums" : ""}`}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AttachmentsPanel({ attachments, onDownload }) {
  const { t } = useTranslation("customer");

  if (!attachments || attachments.length === 0) {
    return (
      <section className={CUSTOMER_PANEL.cardPadded}>
        <p className={CUSTOMER_PANEL.headerLabel}>
          {t("ticketDetail.attachments")}
        </p>
        <p className="mt-2.5 text-[12.5px] text-slate-500">
          {t("ticketDetail.noAttachments")}
        </p>
      </section>
    );
  }

  return (
    <section className={CUSTOMER_PANEL.card}>
      <div className={`flex items-center justify-between ${CUSTOMER_PANEL.header} px-5 py-3`}>
        <p className={CUSTOMER_PANEL.headerLabel}>
          {t("ticketDetail.attachments")}
        </p>
        <span className="text-[11px] font-semibold tabular-nums text-blue-600">
          {attachments.length}
        </span>
      </div>
      <ul className={`${CUSTOMER_PANEL.divide} px-5 py-2`}>
        {attachments.map((att) => (
          <li
            key={att.id}
            className="group flex items-center justify-between gap-2 py-2 text-[12.5px] transition-colors"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className={CUSTOMER_CHIP.fileIcon}>
                <IconFile className="h-3.5 w-3.5" />
              </span>
              <span className={`min-w-0 truncate font-medium ${CUSTOMER_TEXT.body}`} title={att.fileName || att.name}>
                {att.fileName || att.name || t("ticketDetail.attachmentFallback", { id: att.id })}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onDownload?.(att)}
              className={`${SAAS_ICON_BUTTON} h-7 w-7 shrink-0 rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-700`}
              title={t("ticketDetail.download")}
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
  const { t } = useTranslation("customer");

  return (
    <section className={CUSTOMER_PANEL.card}>
      <div className={`flex items-center gap-3 ${CUSTOMER_PANEL.header} px-5 py-3`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
          <IconShield className="h-3.5 w-3.5" />
        </span>
        <p className="text-[12.5px] font-semibold text-gray-900">{t("ticketDetail.trustTitle")}</p>
      </div>
      <p className="px-5 py-3.5 text-[12px] leading-relaxed text-slate-500">
        {t("ticketDetail.trustDesc")}
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
  const { t } = useTranslation("customer");
  const { t: tc } = useTranslation("common");
  const { formatDateTime: fmtDateTime, formatRelativeTime } = useFormatter();
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState("");
  /** When true, customer chose "No" and must enter a reason + Send (or Cancel). */
  const [declineStepOpen, setDeclineStepOpen] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState("SOLVED");
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError, setCloseError] = useState(null);
  const [ticketAfterClose, setTicketAfterClose] = useState(null);
  const {
    editorHeight,
    manualResize,
    minHeight,
    autoGrowMax,
    onEditorAutoHeight,
    onResizePointerDown,
    resetEditorHeight,
  } = useResizableComposerEditor();

  const displaySource = ticketAfterClose ?? ticket;
  const status        = displaySource?.status || "NEW";
  const statusLabel   = getCustomerStatusLabel(status, t);
  const statusBadgeClass = getCustomerStatusBadgeClass(status);
  const statusAccent  = getCustomerStatusAccent(status);
  const priority      = displaySource?.priority || ticket?.priority || "MEDIUM";
  const priorityTone  = PRIORITY_TONE[priority] || PRIORITY_TONE.MEDIUM;
  const priorityLabel = tc(`priority.${priorityTone.key}`);

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
      setCloseError(err?.response?.data?.message || t("ticketDetail.closeError"));
    } finally {
      setCloseLoading(false);
    }
  };

  /* Customer-visible timeline: original message + non-internal comments (incl. system status lines) */
  const timeline = useMemo(() => {
    const ticketData = ticketAfterClose ?? ticket;
    if (!ticketData) return [];
    const entries = [];
    const youLabel = t("ticketDetail.you");
    const supportLabel = t("ticketDetail.supportTeam");

    entries.push({
      kind: "MESSAGE",
      authorType: "CUSTOMER",
      authorName: ticketData.creatorName || customerName || youLabel,
      message: ticketData.description || t("ticketDetail.noDescription"),
      createdAt: ticketData.createdAt,
      isOriginal: true,
    });

    (ticketData.comments || [])
      .filter((c) => !c.isInternal)
      .forEach((c) => {
        if (isSystemAuthorType(c.authorType)) {
          if (shouldHideCustomerSystemTimelineMessage(c.message)) return;
          entries.push({
            kind: "SYSTEM",
            message: c.message,
            displayMessage: formatCustomerSystemTimelineMessage(c.message, t),
            targetStatus: getCustomerSystemTimelineTargetStatus(c.message),
            createdAt: c.createdAt,
          });
          return;
        }
        const isResolutionProposal =
          !isEndUserAuthorType(c.authorType) &&
          messageMatchesResolutionNote(c.message, ticketData.resolutionNote);
        const isRejectionFeedback =
          isEndUserAuthorType(c.authorType) &&
          messageMatchesRejectionNote(c.message, ticketData.customerRejectionNote);
        entries.push({
          kind: "MESSAGE",
          authorType: c.authorType,
          authorName: c.authorName || (isEndUserAuthorType(c.authorType) ? youLabel : supportLabel),
          message: c.message,
          createdAt: c.createdAt,
          isResolutionProposal,
          isRejectionFeedback,
        });
      });

    const resolutionNote = ticketData.resolutionNote != null ? String(ticketData.resolutionNote).trim() : "";
    const hasResolutionInThread =
      resolutionNote !== "" &&
      entries.some(
        (entry) =>
          entry.kind === "MESSAGE" &&
          messageMatchesResolutionNote(entry.message, resolutionNote),
      );
    if (resolutionNote && !hasResolutionInThread) {
      entries.push({
        kind: "MESSAGE",
        authorType: "AGENT",
        authorName: supportLabel,
        message: resolutionNote,
        createdAt: ticketData.updatedAt || ticketData.closedAt || ticketData.createdAt,
        isResolutionProposal: true,
        synthetic: true,
      });
    }

    const rejectionNote =
      ticketData.customerRejectionNote != null ? String(ticketData.customerRejectionNote).trim() : "";
    const hasRejectionInThread =
      rejectionNote !== "" &&
      entries.some(
        (entry) =>
          entry.kind === "MESSAGE" &&
          isEndUserAuthorType(entry.authorType) &&
          messageMatchesRejectionNote(entry.message, rejectionNote),
      );
    if (rejectionNote && !hasRejectionInThread) {
      entries.push({
        kind: "MESSAGE",
        authorType: "USER",
        authorName: ticketData.creatorName || customerName || youLabel,
        message: rejectionNote,
        createdAt: ticketData.updatedAt || ticketData.createdAt,
        isRejectionFeedback: true,
        synthetic: true,
      });
    }

    const ticketStatus = ticketData.status || "NEW";
    const mayShowReviewingFallback =
      ticketData.assigneeId != null &&
      (ticketStatus === "IN_PROGRESS" || ticketStatus === "WAITING_FOR_CUSTOMER") &&
      !customerTimelineShowsTeamReviewing(entries);

    if (mayShowReviewingFallback) {
      const fallbackAt = new Date(ticketData.createdAt || Date.now());
      fallbackAt.setSeconds(fallbackAt.getSeconds() + 1);
      entries.push({
        kind: "SYSTEM",
        message: "",
        displayMessage: getCustomerStatusLabel("IN_PROGRESS", t),
        targetStatus: "IN_PROGRESS",
        createdAt: fallbackAt.toISOString(),
        synthetic: true,
      });
    }

    const sorted = entries.sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    return pruneRedundantCustomerSystemTimelineEntries(sorted, ticketStatus);
  }, [ticket, ticketAfterClose, customerName, t]);

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

  useEffect(() => {
    if (!htmlToPlainText(reply || "")) {
      resetEditorHeight();
    }
  }, [reply, resetEditorHeight]);

  /* Loading state */
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 py-10">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          <p className="mt-3 text-sm text-slate-500">{t("ticketDetail.loading")}</p>
        </div>
      </div>
    );
  }

  /* Error state */
  if (error || !ticket) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 py-10">
        <div className="max-w-sm rounded-customer-card border border-gray-200 bg-white p-6 text-center shadow-customer-card">
          <p className="text-sm font-semibold text-gray-900">{t("ticketDetail.errorTitle")}</p>
          <p className="mt-1 text-xs text-slate-500">{error || t("ticketDetail.errorNotFound")}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <IconArrowLeft className="h-3 w-3" />
            {t("ticketDetail.backToList")}
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
    <div className={CUSTOMER_PAGE.root}>
      <div className={`${CUSTOMER_PAGE.innerWide} flex flex-col gap-5`}>

        {/* ── Back navigation ────────────────────────────────────────────────── */}
        <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-[12px] font-semibold text-gray-600 shadow-customer-card transition-colors hover:border-slate-300 hover:text-gray-900"
          >
            <IconArrowLeft className="h-3 w-3" />
            {t("ticketDetail.backToList")}
          </button>
        </div>

        {/* ── Context bar + title ─────────────────────────────────────────────── */}
        <section
          className={`relative animate-slide-up-fade overflow-hidden ${CUSTOMER_PANEL.card}`}
          style={{ animationDelay: "40ms" }}
        >
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-1"
            style={{ backgroundColor: statusAccent }}
          />

          <TicketContextBar
            portal="customer"
            trailing={
              canCustomerClose ? (
                <button
                  type="button"
                  onClick={() => setShowCloseModal(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {t("ticketDetail.closeRequest")}
                </button>
              ) : null
            }
          >
            <span className={CUSTOMER_CHIP.ticketId}>#{ticket.id}</span>
            <span className={`${CUSTOMER_STATUS_PILL_BASE} ${statusBadgeClass}`} data-testid="customer-ticket-status">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusAccent }} aria-hidden />
              {statusLabel}
            </span>
            <SyncStateChip state={syncState} />
            <span className={`${CUSTOMER_PRIORITY_PILL_BASE} ${getCustomerPriorityBadgeClass(priority)}`}>
              <span className={`mr-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${priorityTone.dot}`} aria-hidden />
              <span className="normal-case tracking-normal">{priorityLabel}</span>
            </span>
          </TicketContextBar>

          <div className="relative flex flex-col gap-3 px-5 py-4 md:px-6 md:py-5">
            <h1 className="text-xl font-bold leading-snug tracking-tight text-gray-900 md:text-2xl">
              {ticket.title || t("ticketDetail.untitled")}
            </h1>

            <div className="flex flex-wrap items-center gap-1.5">
              <MetaChip label={t("ticketDetail.product")} value={ticket.product?.name || t("ticketDetail.general")} />
              <MetaChip label={t("ticketDetail.opened")} value={fmtDateTime(ticket.createdAt)} />
              <MetaChip
                label={t("ticketDetail.lastUpdate")}
                value={formatRelativeTime(ticket.updatedAt || ticket.createdAt) || fmtDateTime(ticket.updatedAt)}
                tone="accent"
              />
            </div>
            {status === "IN_PROGRESS" &&
            ticket.customerRejectionNote &&
            String(ticket.customerRejectionNote).trim() !== "" ? (
              <p className="max-w-2xl rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[12.5px] leading-relaxed text-amber-950">
                <span className="font-semibold">{t("ticketDetail.declinedBanner")} </span>
                {t("ticketDetail.declinedBannerSub")}
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
        <div className="grid min-w-0 grid-cols-1 gap-5 xl:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">

          {/* ── LEFT: conversation + reply (separate cards; thread scrolls inside card) ─ */}
          <div className="flex min-w-0 flex-col gap-4">

            <section
              className={`animate-slide-up-fade ${CUSTOMER_PANEL.card}`}
              style={{ animationDelay: "120ms" }}
            >
              <header className={CUSTOMER_PANEL.header}>
                <div className={CUSTOMER_PANEL.headerInner}>
                  <p className={`shrink-0 ${CUSTOMER_PANEL.headerLabel}`}>
                    {t("ticketDetail.conversation")}
                  </p>
                  <span className="shrink-0 text-[10.5px] font-semibold tabular-nums text-slate-500">
                    {timeline.length} {t("ticketDetail.entry", { count: timeline.length })}
                  </span>
                </div>
              </header>

              <div className={CUSTOMER_PANEL.conversationScroll}>
                <div
                  className="pointer-events-none absolute bottom-2 left-[calc(1rem+0.875rem)] top-2 w-px -translate-x-1/2 bg-slate-200 md:left-[calc(1.25rem+0.875rem)]"
                  aria-hidden
                />
                <div className="relative space-y-2.5">
                  {timeline.map((entry, idx) => {
                    if (entry.kind === "SYSTEM") {
                      const statusAccent =
                        getCustomerStatusAccent(entry.targetStatus) || "#2563EB";
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
                          <p className="min-w-0 flex-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] leading-[1.35] text-slate-700 shadow-customer-card">
                            <span className="font-semibold text-blue-700">{t("ticketDetail.status")}</span>
                            <span className="text-slate-500"> · </span>
                            <span>{entry.displayMessage}</span>
                            <span
                              className="ml-1 whitespace-nowrap text-[10px] font-medium text-slate-500"
                              title={fmtDateTime(entry.createdAt)}
                            >
                              · {formatRelativeTime(entry.createdAt) || fmtDateTime(entry.createdAt)}
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
                          "relative flex gap-2 rounded-lg py-2 pr-1",
                          isCustomer ? "bg-sky-50/30" : "bg-blue-50/25",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden
                          className="relative z-[1] flex w-7 shrink-0 justify-center"
                        >
                          <span
                            className={[
                              "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ring-1 ring-inset",
                              isCustomer
                                ? "bg-sky-100 text-sky-800 ring-sky-200/90"
                                : "bg-blue-600 text-white ring-blue-200/60",
                            ].join(" ")}
                          >
                            {initialsFor(entry.authorType, customerName)}
                          </span>
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <p
                              className={[
                                "text-sm font-semibold",
                                isCustomer ? "text-sky-900" : "text-blue-900",
                              ].join(" ")}
                            >
                              {isCustomer ? entry.authorName || t("ticketDetail.you") : t("ticketDetail.supportTeam")}
                            </p>
                            {!isCustomer ? (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.06em] text-blue-800 ring-1 ring-inset ring-blue-200/80">
                                {entry.isResolutionProposal ? t("ticketDetail.ourSolution") : t("ticketDetail.agent")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-sky-100 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.06em] text-sky-800 ring-1 ring-inset ring-sky-200/80">
                                {entry.isRejectionFeedback ? t("ticketDetail.yourFeedback") : t("ticketDetail.you")}
                              </span>
                            )}
                            {entry.isOriginal ? (
                              <span className="inline-flex items-center rounded-full bg-white/80 px-1.5 py-px text-[9.5px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200/90">
                                {t("ticketDetail.originalRequest")}
                              </span>
                            ) : null}
                            <span
                              className="ml-auto text-[10.5px] text-slate-500"
                              title={fmtDateTime(entry.createdAt)}
                            >
                              {formatRelativeTime(entry.createdAt) || fmtDateTime(entry.createdAt)}
                            </span>
                          </div>

                          <div
                            className={[
                              "mt-1 rounded-lg border-l-[3px] bg-white p-4 shadow-customer-card ring-1 ring-inset",
                              messageProseClass(entry.message),
                              isCustomer
                                ? "border-sky-500 text-slate-800 ring-sky-200/45"
                                : "border-blue-600 text-slate-800 ring-blue-200/40",
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
                                      : "border-blue-200/80 bg-blue-50 text-blue-900 hover:bg-blue-100",
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
                className="animate-slide-up-fade overflow-hidden rounded-customer-card border border-emerald-200/80 bg-emerald-50/95 shadow-customer-card"
                style={{ animationDelay: "140ms" }}
              >
                <div className="border-b border-emerald-100/90 bg-white/60 px-5 py-3">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-800/90">{t("ticketDetail.decisionEyebrow")}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{t("ticketDetail.decisionTitle")}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-600">
                    {t("ticketDetail.decisionDesc")}
                  </p>
                </div>
                <div className="flex flex-col gap-3 px-5 py-4">
                  {declineStepOpen ? (
                    <>
                      <div>
                        <label
                          htmlFor="decline-resolution-reason"
                          className="text-[12px] font-semibold text-gray-900"
                        >
                          {t("ticketDetail.declineLabel")}
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
                          placeholder={t("ticketDetail.declinePlaceholder")}
                          className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-600/15 disabled:opacity-50"
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
                          className="inline-flex h-10 min-h-[2.5rem] items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 transition hover:bg-slate-50 disabled:opacity-50 sm:min-w-[7.5rem]"
                        >
                          {tc("button.cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const note = declineReason.trim();
                            if (!note) {
                              setDeclineError(t("ticketDetail.declineRequired"));
                              return;
                            }
                            setDeclineError("");
                            await onRejectResolution?.(note);
                          }}
                          disabled={resolutionBusy}
                          className="inline-flex h-10 min-h-[2.5rem] items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50 sm:min-w-[7.5rem]"
                        >
                          {resolutionBusy ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          ) : (
                            t("ticketDetail.sendRejection")
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                      <button
                        type="button"
                        data-testid="accept-solution"
                        onClick={() => onAcceptResolution?.()}
                        disabled={resolutionBusy}
                        className="inline-flex h-10 min-h-[2.5rem] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {resolutionBusy ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <IconCheck className="h-4 w-4" />
                        )}
                        {t("ticketDetail.acceptClose")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeclineStepOpen(true);
                          setDeclineError("");
                        }}
                        disabled={resolutionBusy}
                        className="inline-flex h-10 min-h-[2.5rem] flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-bold text-gray-800 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {t("ticketDetail.declineHelp")}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {isClosed ? (
              <section
                className={`animate-slide-up-fade ${CUSTOMER_PANEL.cardPadded}`}
                style={{ animationDelay: "160ms" }}
              >
                <p className="text-center text-sm text-slate-500">
                  {t("ticketDetail.closedNotice")}
                </p>
              </section>
            ) : isResolvedPendingCustomer ? null : (
              <section
                className={`animate-slide-up-fade space-y-4 ${CUSTOMER_PANEL.cardPadded}`}
                style={{ animationDelay: "160ms" }}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t("ticketDetail.replyTitle")}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("ticketDetail.replyDesc")}
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white">
                  <DestrovaComposer
                    editorName="reply"
                    editorValue={reply}
                    onEditorChange={(e) => onReplyChange(e.target.value)}
                    editorPlaceholder={t("ticketDetail.replyPlaceholder")}
                    disabled={isSendingReply}
                    className={`${CUSTOMER_PAGE.composerShell} !rounded-b-none !shadow-none`}
                    editorBodyHeightPx={editorHeight}
                    editorAutoGrow={!manualResize}
                    editorAutoGrowMinPx={minHeight}
                    editorAutoGrowMaxPx={autoGrowMax}
                    onEditorAutoHeight={onEditorAutoHeight}
                    editorTestId="ticket-comment-editor"
                  />
                  <ComposerResizeHandle onPointerDown={onResizePointerDown} />
                </div>

                {replyFiles && replyFiles.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-2.5">
                    <ul className="flex flex-wrap gap-1.5">
                      {replyFiles.map((file, index) => (
                        <li key={`${file.name}-${index}`}>
                          <button
                            type="button"
                            onClick={() => onRemoveReplyFile?.(index)}
                            className={CUSTOMER_CHIP.attachmentPill}
                            title={t("ticketDetail.removeAttachment")}
                          >
                            <IconFile className="h-3.5 w-3.5" />
                            <span className="max-w-[12rem] truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-500">{Math.round(file.size / 1024)} KB</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {isSendingReply && replyFiles && replyFiles.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between text-[11.5px] text-slate-500">
                      <span>{t("newTicket.uploading")}</span>
                      <span className="tabular-nums">{replyUploadProgress || 0}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${replyUploadProgress || 0}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col-reverse items-stretch justify-between gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center">
                  <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 self-start rounded-lg border border-gray-200 bg-white px-3 text-[12.5px] font-medium text-gray-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-gray-900">
                    <IconPaperclip className="h-3.5 w-3.5" />
                    {t("ticketDetail.attachFiles")}
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
                        <span>{t("ticketDetail.sending")}</span>
                      </>
                    ) : (
                      <>
                        <span className="destrova-submit-request-btn__icon">
                          <IconPaperPlane />
                        </span>
                        <span className="destrova-submit-request-btn__label">{t("ticketDetail.sendReply")}</span>
                      </>
                    )}
                  </button>
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
            <SummaryPanel ticket={ticket} priorityLabel={priorityLabel} priorityDot={priorityTone.dot} />
            <AttachmentsPanel attachments={attachments} onDownload={onDownloadAttachment} />
            <TrustPanel />
          </aside>
        </div>
      </div>

      {showCloseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-[15px] font-semibold text-slate-900">{t("ticketDetail.closeModal.title")}</h3>
            <p className="mb-4 text-[13px] text-slate-500">{t("ticketDetail.closeModal.reasonLabel")}</p>
            <select
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="SOLVED">{t("ticketDetail.closeModal.reasons.solved")}</option>
              <option value="NO_RESPONSE">{t("ticketDetail.closeModal.reasons.noResponse")}</option>
              <option value="DUPLICATE">{t("ticketDetail.closeModal.reasons.duplicate")}</option>
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
                {t("ticketDetail.closeModal.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCustomerClose}
                disabled={closeLoading}
                className="rounded-lg bg-slate-800 px-4 py-2 text-[13px] font-medium text-white hover:bg-slate-900 disabled:opacity-50"
              >
                {closeLoading ? t("ticketDetail.closeModal.closing") : t("ticketDetail.closeModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
