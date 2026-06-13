/** Maps backend notification headlines (English) → notifications.json keys. */
const HEADLINE_I18N = {
  "sla warning": "headlines.slaWarning",
  "sla breached": "headlines.slaBreached",
  "customer responded": "headlines.customerResponded",
  "request reopened": "headlines.requestReopened",
  "being reviewed": "headlines.beingReviewed",
  "response needed": "headlines.responseNeeded",
  "solution proposed": "headlines.solutionProposed",
  "status updated": "headlines.statusUpdated",
  "customer declined": "headlines.customerDeclined",
  "moved to waiting": "headlines.movedToWaiting",
  "marked as resolved": "headlines.markedAsResolved",
  "request received": "headlines.requestReceived",
  "new request assigned": "headlines.newRequestAssigned",
  "request transferred": "headlines.requestTransferred",
  "transfer request": "headlines.transferRequest",
  "transfer pending": "headlines.transferPending",
  "transfer approved": "headlines.transferApproved",
  "transfer declined": "headlines.transferDeclined",
  "request closed": "headlines.requestClosed",
  "new customer reply": "headlines.newCustomerReply",
  "new reply on request": "headlines.newReplyOnRequest",
  "you were mentioned": "headlines.youWereMentioned",
  "new internal note": "headlines.newInternalNote",
};

/** Exact detail tail matches from NotificationService (English). */
const DETAIL_I18N = {
  "immediate action required.": "details.immediateAction",
  "request back in progress.": "details.backInProgress",
  "you declined the solution.": "details.youDeclinedSolution",
  "our team is now reviewing your request.": "details.teamReviewing",
  "please check the latest update.": "details.checkLatestUpdate",
  "please review and accept or decline.": "details.reviewAcceptDecline",
  "your request status has changed.": "details.statusChangedGeneric",
  "resolution declined, request reopened.": "details.resolutionDeclinedReopened",
  "solution declined - ticket reopened.": "details.solutionDeclinedReopened",
  "request status changed to in progress.": "details.statusInProgress",
  "request moved to waiting for customer.": "details.movedWaitingCustomer",
  "awaiting customer confirmation.": "details.awaitingConfirmation",
  "request status has changed.": "details.statusHasChanged",
  "we'll start working on it soon.": "details.startWorkingSoon",
  "a request has been assigned to you.": "details.assignedToYou",
  "a request has been transferred to you.": "details.transferredToYou",
  "a colleague requested to transfer a ticket to you. open the ticket to approve or decline.": "details.transferApproveDecline",
  "your transfer request is waiting for the other agent's approval.": "details.transferWaitingApproval",
  "your transfer request was approved. the ticket has been reassigned.": "details.transferApprovedDetail",
  "your transfer request was declined. you remain the assignee.": "details.transferDeclinedDetail",
  "thank you!": "details.thankYou",
  "the request has been closed.": "details.requestClosed",
  "new reply from customer.": "details.newReplyFromCustomer",
  "please check the latest response.": "details.checkLatestResponse",
  "you were mentioned in an internal note.": "details.mentionedInNote",
  "new note on a request you're following.": "details.newNoteFollowing",
};

/**
 * @param {string} message — `#id — Headline|||HH:mm · detail`
 */
export function parseNotificationMessage(message) {
  const raw = String(message || "").trim();
  const parts = raw.split("|||");
  const titlePart = (parts[0] || "").trim();
  const tailPart = (parts[1] || "").trim();
  const ticketMatch = titlePart.match(/^#(\d+)/);
  const cleanTitle = titlePart.replace(/^#\d+\s*[—–-]\s*/, "").trim();
  const detailMatch = tailPart.match(/^(?:\d{1,2}:\d{2}\s*·\s*)?(.*)$/s);
  const detail = detailMatch ? detailMatch[1].trim() : tailPart;
  return {
    ticketId: ticketMatch?.[1] ?? null,
    headline: cleanTitle,
    detail,
  };
}

/** @param {string} headline @param {(key: string, opts?: object) => string} tn */
export function translateNotificationHeadline(headline, tn) {
  const key = HEADLINE_I18N[String(headline || "").trim().toLowerCase()];
  return key ? tn(key) : headline;
}

/** @param {string} detail @param {(key: string, opts?: object) => string} tn */
export function translateNotificationDetail(detail, tn) {
  const raw = String(detail || "").trim();
  if (!raw) return "";

  const mins = raw.match(/^(\d+)\s+minutes remaining\.?$/i);
  if (mins) {
    return tn("details.minutesRemaining", { count: Number(mins[1]) });
  }

  const key = DETAIL_I18N[raw.toLowerCase()];
  return key ? tn(key) : raw;
}

/** Visual tone from API type and/or English headline (pre-translation). */
export function getNotificationVisualKind(type, headline) {
  const code = String(type || "").toUpperCase();
  if (code === "SLA_BREACHED") return "danger";
  if (code === "SLA_WARNING") return "warning";
  if (code === "TICKET_CLOSED") return "success";

  const h = String(headline || "").toLowerCase();
  if (h.includes("sla breached") || h.includes("sla breach") || h.includes("customer declined") || h.includes("transfer declined")) {
    return "danger";
  }
  if (h.includes("sla warning") || h.includes("at risk") || h.includes("reopened") || h.includes("transfer pending")) {
    return "warning";
  }
  if (h.includes("closed") || h.includes("resolved") || h.includes("transfer approved")) {
    return "success";
  }
  if (
    h.includes("assigned")
    || h.includes("transferred")
    || h.includes("comment")
    || h.includes("reply")
    || h.includes("mentioned")
    || h.includes("note")
    || h.includes("solution proposed")
  ) {
    return "primary";
  }
  return "neutral";
}
