import httpClient, { getDestrovaApiErrorMessage } from "./httpClient";

export { getDestrovaApiErrorMessage };

/** Default poll settings (matches backend `destrova.workflow.poll`). */
export const DEFAULT_POLL_CONFIG = {
  recommendedIntervalMs: 500,
  maxAttempts: 20,
  timeoutMs: 10000,
};

/**
 * Expected DB projection per action (static fields). Dynamic fields (assigneeId, closureReason, priority)
 * should be merged by the caller before polling.
 */
export const ACTION_EXPECTED_PROJECTION = {
  assign: { status: "IN_PROGRESS" },
  unassign: { assigneeId: null },
  "wait-for-customer": { status: "WAITING_FOR_CUSTOMER" },
  resume: { status: "IN_PROGRESS" },
  resolve: { status: "RESOLVED" },
  close: { status: "CLOSED" },
  "change-priority": {},
  approve: { status: "CLOSED", closureReason: "CUSTOMER_APPROVED" },
  reject: { status: "IN_PROGRESS" },
  "assign-to-me": { status: "IN_PROGRESS" },
};

export class ProjectionTimeoutError extends Error {
  /**
   * @param {string} message
   * @param {{ ticketId?: number|string, expectedProjection?: object, lastTicket?: object }} [details]
   */
  constructor(message, details = {}) {
    super(message);
    this.name = "ProjectionTimeoutError";
    this.ticketId = details.ticketId;
    this.expectedProjection = details.expectedProjection;
    this.lastTicket = details.lastTicket;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {object} ticket
 * @param {object} expectedProjection
 * @returns {boolean}
 */
function ticketMatchesProjection(ticket, expectedProjection) {
  if (!ticket || !expectedProjection) return false;
  return Object.entries(expectedProjection).every(([key, expected]) => {
    if (expected === undefined) return true;
    const actual = ticket[key];
    if (expected === null) {
      return actual == null;
    }
    return String(actual) === String(expected);
  });
}

/**
 * POST /api/tickets/{id}/actions/{action} — returns parsed 202 body.
 * @param {number|string} ticketId
 * @param {string} action
 * @param {object} [body]
 * @returns {Promise<object>}
 */
export async function executeTicketAction(ticketId, action, body) {
  const path = `tickets/${ticketId}/actions/${action}`;
  const payload = body !== undefined && body !== null ? body : {};
  const response = await httpClient.post(path, payload);
  return response.data;
}

/**
 * Poll GET ticket until expected projection fields match or timeout.
 * @param {number|string} ticketId
 * @param {object} expectedProjection
 * @param {object} [pollConfig]
 * @param {() => Promise<object>} getTicketByIdFn
 * @returns {Promise<object>} confirmed ticket
 */
export async function waitForTicketProjection(
  ticketId,
  expectedProjection,
  pollConfig,
  getTicketByIdFn
) {
  const poll = { ...DEFAULT_POLL_CONFIG, ...pollConfig };
  const interval = poll.recommendedIntervalMs ?? DEFAULT_POLL_CONFIG.recommendedIntervalMs;
  const maxAttempts = poll.maxAttempts ?? DEFAULT_POLL_CONFIG.maxAttempts;
  const timeoutMs = poll.timeoutMs ?? DEFAULT_POLL_CONFIG.timeoutMs;
  const deadline = Date.now() + timeoutMs;

  let lastTicket = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (Date.now() >= deadline) break;

    lastTicket = await getTicketByIdFn();
    if (ticketMatchesProjection(lastTicket, expectedProjection)) {
      return lastTicket;
    }

    if (attempt < maxAttempts - 1 && Date.now() + interval < deadline) {
      await sleep(interval);
    }
  }

  throw new ProjectionTimeoutError(
    `Ticket #${ticketId} projection did not match within ${timeoutMs}ms`,
    { ticketId, expectedProjection, lastTicket }
  );
}

/**
 * Map status transition to action API name (agent/manager workflow).
 * Customer approve/reject and assignee changes use dedicated actions.
 * @param {string} currentStatus
 * @param {string} targetStatus
 * @returns {string|null}
 */
export function statusToAction(currentStatus, targetStatus) {
  const from = String(currentStatus || "").toUpperCase();
  const to = String(targetStatus || "").toUpperCase();
  if (!from || !to || from === to) return null;

  if (to === "WAITING_FOR_CUSTOMER") return "wait-for-customer";
  if (to === "IN_PROGRESS" && from === "WAITING_FOR_CUSTOMER") return "resume";
  if (to === "RESOLVED") return "resolve";
  if (to === "CLOSED") return "close";

  return null;
}

/**
 * @param {string} action
 * @param {object} [overrides]
 * @returns {object}
 */
export function buildExpectedProjection(action, overrides = {}) {
  const base = ACTION_EXPECTED_PROJECTION[action] ?? {};
  return { ...base, ...overrides };
}
