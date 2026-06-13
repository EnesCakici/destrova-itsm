/**
 * Backend: IllegalStateException — "Agent bilet limitine ulasti! Mevcut: X/Y"
 * Agents cannot change limits; only managers/admins can.
 */

/**
 * @param {unknown} errOrMessage — Error, API response fragment, or raw message string
 * @returns {boolean}
 */
export function isAgentCapacityLimitError(errOrMessage) {
  const msg =
    typeof errOrMessage === "string"
      ? errOrMessage
      : errOrMessage?.response?.data?.message ||
        errOrMessage?.response?.data?.error ||
        errOrMessage?.message ||
        "";
  const lower = String(msg).toLowerCase();
  return (
    lower.includes("bilet limitine") ||
    lower.includes("ticket limit") ||
    lower.includes("open-ticket limit") ||
    (lower.includes("capacity") && lower.includes("limit"))
  );
}

/** @typedef {"assign" | "transfer" | "self" | "manager" | "peerWarning"} AgentCapacityContext */

const MESSAGES = {
  /** Manager reassigns ticket to an agent (Apply changes). */
  manager:
    "This agent is at their open-ticket limit. Choose another assignee or contact your manager to review team workload.",
  /** Agent assigns unassigned ticket to self. */
  self:
    "You're at your open-ticket limit. Contact your manager to review your workload before taking more tickets.",
  /** Agent transfers / assigns to a colleague. */
  transfer:
    "That agent is at their open-ticket limit. Choose another colleague or contact your manager to review workload.",
  /** Generic assign to another agent. */
  assign:
    "This agent is at their open-ticket limit. Choose another agent or contact your manager to review workload.",
  /** Proactive hint in transfer dropdown (before submit). */
  peerWarning:
    "At open-ticket limit — choose another agent or contact your manager to review workload.",
};

export const CAPACITY_MESSAGE_I18N_KEYS = {
  manager: "agent:capacity.manager",
  self: "agent:capacity.self",
  transfer: "agent:capacity.transfer",
  assign: "agent:capacity.assign",
  peerWarning: "agent:capacity.peerWarning",
};

/**
 * @param {unknown} err
 * @param {AgentCapacityContext} [context]
 * @returns {string|null} User-facing message when this is a capacity-limit error
 */
export function resolveAgentCapacityLimitMessage(err, context = "assign") {
  if (!isAgentCapacityLimitError(err)) return null;
  return getAgentCapacityLimitMessage(context);
}

/**
 * @param {AgentCapacityContext} [context]
 * @returns {string}
 */
export function getAgentCapacityLimitMessage(context = "assign") {
  return MESSAGES[context] ?? MESSAGES.assign;
}

/**
 * @param {AgentCapacityContext} [context]
 * @param {(key: string) => string} [t]
 * @returns {string}
 */
export function getAgentCapacityLimitMessageI18n(context = "assign", t) {
  const key = CAPACITY_MESSAGE_I18N_KEYS[context] ?? CAPACITY_MESSAGE_I18N_KEYS.assign;
  if (t) return t(key);
  return getAgentCapacityLimitMessage(context);
}

/**
 * @param {unknown} err
 * @param {string} fallback
 * @param {AgentCapacityContext} [context]
 * @param {(err: unknown, fb: string) => string} formatFallback — e.g. getDestrovaApiErrorMessage
 * @returns {string}
 */
export function formatApiErrorWithCapacityHint(
  err,
  fallback,
  context,
  formatFallback,
) {
  const capacity = resolveAgentCapacityLimitMessage(err, context);
  if (capacity) return capacity;
  return formatFallback(err, fallback);
}
