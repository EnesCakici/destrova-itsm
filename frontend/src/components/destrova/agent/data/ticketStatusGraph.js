import { mapTicketStatusToAgentLabel } from "../mappers/agentTicketMappers";
import { statusToAction } from "../../shared/api/ticketActions";

/**
 * UI hints for allowed targets; authoritative transitions are enforced by jBPM + action API.
 * @param {string} currentStatus
 * @returns {string[]} allowed target statuses (excluding staying on current; include current in UI separately)
 */
export function getValidNextStatuses(currentStatus) {
  const c = String(currentStatus || "NEW");
  const next = (() => {
    switch (c) {
      case "NEW":
        return ["IN_PROGRESS"];
      case "IN_PROGRESS":
        return ["WAITING_FOR_CUSTOMER", "RESOLVED"];
      case "WAITING_FOR_CUSTOMER":
        return ["IN_PROGRESS"];
      case "RESOLVED":
        return ["CLOSED", "IN_PROGRESS"];
      case "CLOSED":
        return [];
      default:
        return [];
    }
  })();
  return next;
}

/**
 * Agent workflow: cannot close a ticket; customer approves/declines from Resolved.
 * From Resolved, agent cannot change status.
 */
export function getAgentValidNextStatuses(currentStatus) {
  const c = String(currentStatus || "NEW");
  if (c === "RESOLVED" || c === "CLOSED") {
    return [];
  }
  return getValidNextStatuses(c).filter((s) => s !== "CLOSED");
}

/**
 * @param {string} currentStatus
 * @returns {{ value: string, label: string }[]}
 */
export function getStatusOptionsForSelect(currentStatus) {
  const c = String(currentStatus || "NEW");
  const next = getValidNextStatuses(c);
  const values = new Set([c, ...next]);
  return Array.from(values).map((value) => ({
    value,
    label: mapTicketStatusToAgentLabel(value),
  }));
}

export function getAgentStatusOptionsForSelect(currentStatus) {
  const c = String(currentStatus || "NEW");
  const next = getAgentValidNextStatuses(c);
  const values = new Set([c, ...next]);
  return Array.from(values).map((value) => ({
    value,
    label: mapTicketStatusToAgentLabel(value),
  }));
}

export const PRIORITY_API_VALUES = ["HIGH", "MEDIUM", "LOW"];

/**
 * Map a status transition to a Faz 1 action name (agent/manager). Returns null if unsupported.
 * UI options in getAgentValidNextStatuses are hints only — backend/jBPM is authoritative.
 * NEW → IN_PROGRESS is handled via assign (with assigneeId), not statusToAction.
 * @param {string} fromStatus
 * @param {string} toStatus
 * @returns {string|null}
 */
export function getActionForStatusTransition(fromStatus, toStatus) {
  return statusToAction(fromStatus, toStatus);
}
