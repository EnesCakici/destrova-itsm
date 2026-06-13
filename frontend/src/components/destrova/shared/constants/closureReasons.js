/** Closure reason enum values → customer-facing / agent UI labels. */
export const CLOSURE_REASON_LABELS = {
  SOLVED: "Issue resolved",
  CUSTOMER_APPROVED: "Approved by customer",
  INVALID: "Invalid / Spam",
  NO_RESPONSE: "No customer response",
  DUPLICATE: "Duplicate request",
};

export const CLOSURE_REASON_I18N_KEYS = {
  SOLVED: "common:closureReason.solved",
  CUSTOMER_APPROVED: "common:closureReason.customerApproved",
  INVALID: "common:closureReason.invalid",
  NO_RESPONSE: "common:closureReason.noResponse",
  DUPLICATE: "common:closureReason.duplicate",
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
 * @param {string|null|undefined} value
 * @param {(key: string) => string} [t]
 * @returns {string}
 */
export function formatClosureReasonI18n(value, t) {
  if (!value) return "";
  const key = String(value).trim().toUpperCase();
  const i18nKey = CLOSURE_REASON_I18N_KEYS[key];
  if (i18nKey && t) return t(i18nKey);
  return formatClosureReason(value);
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
