import { htmlToPlainText } from "../htmlPlainText";

/** Matches backend {@code TicketService.RESOLUTION_NOTE_MIN_LENGTH}. */
export const RESOLUTION_NOTE_MIN_LENGTH = 10;

/** Backend system comment text — compare in English only (never translate before match). */
export const RESOLUTION_SYSTEM_MESSAGE = "Solution proposed — awaiting customer confirmation.";
export const RESOLUTION_DECLINED_SYSTEM_MESSAGE = "Customer declined the solution — ticket reopened.";

/** @param {string} message @param {(key: string) => string} [tv] validation namespace */
export function formatResolutionSystemMessage(message, tv) {
  const raw = String(message || "").trim().toLowerCase();
  if (!tv) return message;
  if (raw === RESOLUTION_SYSTEM_MESSAGE.toLowerCase()) {
    return tv("resolution.systemProposed");
  }
  if (raw === RESOLUTION_DECLINED_SYSTEM_MESSAGE.toLowerCase()) {
    return tv("resolution.declined");
  }
  return message;
}

export function isResolutionNoteValid(note) {
  const trimmed = String(note || "").trim();
  return trimmed.length >= RESOLUTION_NOTE_MIN_LENGTH;
}

export function messageMatchesResolutionNote(message, resolutionNote) {
  const note = String(resolutionNote || "").trim();
  if (!note) return false;
  const body = htmlToPlainText(String(message || "")).trim();
  return body === note;
}

export function messageMatchesRejectionNote(message, rejectionNote) {
  const note = String(rejectionNote || "").trim();
  if (!note) return false;
  const body = htmlToPlainText(String(message || "")).trim();
  return body === note;
}
