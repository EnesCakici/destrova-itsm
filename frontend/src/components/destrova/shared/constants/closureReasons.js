/** Closure reason enum values → customer-facing / agent UI labels. */
export const CLOSURE_REASON_LABELS = {
  SOLVED: "Issue resolved",
  CUSTOMER_APPROVED: "Approved by customer",
  INVALID: "Invalid / Spam",
  NO_RESPONSE: "No customer response",
  DUPLICATE: "Duplicate request",
};

/** Agent/manager idari kapatma — jBPM FORCE_CLOSED ile aynı set. */
export const AGENT_FORCE_CLOSE_REASONS = ["INVALID", "DUPLICATE", "NO_RESPONSE"];

export const MANAGER_FORCE_CLOSE_REASONS = AGENT_FORCE_CLOSE_REASONS;

/**
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function formatClosureReason(value) {
  if (!value) return "";
  const key = String(value).trim().toUpperCase();
  return CLOSURE_REASON_LABELS[key] ?? String(value);
}

/**
 * @param {string[]} reasonKeys
 * @returns {{ value: string, label: string }[]}
 */
export function closureReasonOptions(reasonKeys) {
  return (reasonKeys || []).map((value) => ({
    value,
    label: CLOSURE_REASON_LABELS[value] ?? value,
  }));
}
