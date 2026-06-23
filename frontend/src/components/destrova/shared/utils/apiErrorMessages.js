import {
  CAPACITY_MESSAGE_I18N_KEYS,
  getAgentCapacityLimitMessage,
  isAgentCapacityLimitError,
  resolveAgentCapacityLimitMessage,
} from "./agentCapacityMessages";

/** @typedef {"assign" | "transfer" | "self" | "manager" | "peerWarning"} AgentCapacityContext */

/**
 * Raw API error message (for logs / E2E — not for direct UI display).
 * @param {unknown} error
 * @returns {string}
 */
export function extractApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object" && typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  if (error?.message && String(error.message).trim()) {
    return String(error.message).trim();
  }
  return "";
}

/**
 * @param {string} raw
 * @returns {string|null}
 */
function matchKnownPattern(raw) {
  const lower = raw.toLowerCase();

  if (/bilet limitine|ticket limit|open-ticket limit/.test(lower)) {
    return null; // handled by capacity branch
  }
  if (/kaynak ve hedef agent ayni|same.*agent|source and target.*same/.test(lower)) {
    return "transfer.sameAgent";
  }
  if (/bekleyen devir talebi yok|no pending transfer/.test(lower)) {
    return "transfer.noPending";
  }
  if (/zaten bekleyen bir devir|already.*pending transfer/.test(lower)) {
    return "transfer.duplicatePending";
  }
  if (/hedef agent devir|only the target agent.*transfer|target agent.*approve/.test(lower)) {
    return "transfer.wrongAgent";
  }
  if (/ticket zaten bu agent|already assigned to this agent/.test(lower)) {
    return "transfer.alreadyAssigned";
  }
  if (/erisim yetkiniz yok|do not have access|not have access to this ticket/.test(lower)) {
    return "access.denied";
  }
  if (/size ait degil|does not belong to you/.test(lower)) {
    return "access.notOwner";
  }
  if (/yetkiniz bulunmamakt|not authorized|forbidden/.test(lower)) {
    return "access.forbidden";
  }
  if (/en az 1 olmal|at least 1/.test(lower) && /limit/.test(lower)) {
    return "capacity.invalidLimit";
  }
  if (/title must be at most|title.*200/.test(lower)) {
    return "validation.titleTooLong";
  }
  if (/title is required/.test(lower)) {
    return "validation.titleRequired";
  }
  if (/description is required/.test(lower)) {
    return "validation.descriptionRequired";
  }
  if (/e-posta adresi zorunlu|email.*required|email address is required/.test(lower)) {
    return "validation.emailRequired";
  }
  if (/ad soyad zorunlu|full name is required|name is required/.test(lower)) {
    return "validation.nameRequired";
  }
  if (/user with this email already exists|email address already exists/.test(lower)) {
    return "validation.duplicateEmail";
  }
  if (/team name is required|takim adi/.test(lower)) {
    return "validation.teamNameRequired";
  }
  if (/resolution note must be at least|resolution note is required/.test(lower)) {
    return "validation.resolutionNote";
  }
  if (/yorum mesaji zorunlu|comment.*required|message.*required/.test(lower)) {
    return "validation.commentRequired";
  }
  if (/efor suresi|duration.*greater than zero|worklog.*duration/.test(lower)) {
    return "validation.worklogDuration";
  }
  if (/worklog aciklamasi|worklog.*description|worklog.*required/.test(lower)) {
    return "validation.worklogDescription";
  }
  if (/file size cannot exceed|file is too large/.test(lower)) {
    return "validation.fileTooLarge";
  }
  if (/file type is not allowed|unsupported file type/.test(lower)) {
    return "validation.fileType";
  }
  if (/jbpm|workflow.*unavailable/.test(lower)) {
    return "workflow.unavailable";
  }
  if (/already closed|ticket is already closed/.test(lower)) {
    return "workflow.alreadyClosed";
  }
  if (/not awaiting approval|awaiting approval/.test(lower)) {
    return "workflow.notAwaitingApproval";
  }
  if (/kapatma nedeni.*musteri|cannot be used by customer|customer.*closure/.test(lower)) {
    return "closure.customerNotAllowed";
  }
  if (/invalid workflow|conflict/.test(lower)) {
    return "workflow.conflict";
  }

  return null;
}

/**
 * Map API errors to user-facing copy. Never surfaces HTTP status codes.
 *
 * @param {unknown} error
 * @param {{
 *   fallback?: string,
 *   context?: AgentCapacityContext,
 *   t?: (key: string, options?: object) => string,
 * }} [options]
 * @returns {string}
 */
export function resolveApiUserMessage(error, options = {}) {
  const {
    fallback = "Something went wrong. Please try again.",
    context = "assign",
    t,
  } = options;

  const raw = extractApiErrorMessage(error);
  const status = error?.response?.status;

  if (isAgentCapacityLimitError(error)) {
    const i18nKey = CAPACITY_MESSAGE_I18N_KEYS[context] ?? CAPACITY_MESSAGE_I18N_KEYS.assign;
    if (t) {
      return t(i18nKey);
    }
    return resolveAgentCapacityLimitMessage(error, context) ?? getAgentCapacityLimitMessage(context);
  }

  const patternKey = raw ? matchKnownPattern(raw) : null;
  if (patternKey && t) {
    const i18nKey = `errors:${patternKey}`;
    const translated = t(i18nKey);
    if (translated && translated !== i18nKey) {
      return translated;
    }
  }

  if (status === 401) {
    return t?.("errors:session.expired", { defaultValue: "Your session has expired. Please sign in again." })
      ?? "Your session has expired. Please sign in again.";
  }
  if (status === 403) {
    return t?.("errors:access.forbidden", { defaultValue: "You don't have permission to perform this action." })
      ?? "You don't have permission to perform this action.";
  }
  if (status === 503) {
    return t?.("errors:workflow.unavailable", { defaultValue: "The workflow service is temporarily unavailable. Please try again shortly." })
      ?? "The workflow service is temporarily unavailable. Please try again shortly.";
  }
  if (status === 409) {
    return t?.("errors:workflow.conflict", { defaultValue: "This action conflicts with the ticket's current state. Refresh and try again." })
      ?? "This action conflicts with the ticket's current state. Refresh and try again.";
  }
  if (status >= 500) {
    return t?.("errors:generic.server", { defaultValue: "Something went wrong on our side. Please try again later." })
      ?? "Something went wrong on our side. Please try again later.";
  }

  return fallback;
}
