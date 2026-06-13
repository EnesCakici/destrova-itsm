/**
 * Ticket attachment rules — aligned with backend AttachmentController + FileStorageService.
 * Max 5 files per user per ticket, 10 MB per file, allowed extensions below.
 */

export const ATTACHMENT_POLICY = {
  MAX_FILES_PER_USER: 5,
  /** @deprecated Use MAX_FILES_PER_USER */
  MAX_FILES_PER_TICKET: 5,
  MAX_BYTES_PER_FILE: 10 * 1024 * 1024,
  ALLOWED_EXTENSIONS: ["jpg", "jpeg", "png", "pdf", "txt", "log", "zip"],
  acceptInput:
    ".jpg,.jpeg,.png,.pdf,.txt,.log,.zip,image/jpeg,image/png,application/pdf,text/plain,application/zip",
};

const { MAX_FILES_PER_USER, MAX_BYTES_PER_FILE, ALLOWED_EXTENSIONS } = ATTACHMENT_POLICY;
const EXT_ALLOW = new Set(ALLOWED_EXTENSIONS);
const TYPES_LABEL = ALLOWED_EXTENSIONS.join(", ");
const MAX_MB = MAX_BYTES_PER_FILE / (1024 * 1024);

function fileExt(name) {
  const m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

function translate(t, key, params, fallback) {
  if (typeof t === "function") {
    return t(key, params);
  }
  return fallback;
}

/**
 * Count attachments on a ticket uploaded by the given Keycloak sub.
 * @param {Array<{ uploadedBySub?: string }>} attachments
 * @param {string | null | undefined} uploadedBySub
 */
export function countOwnServerAttachments(attachments, uploadedBySub) {
  if (!Array.isArray(attachments) || attachments.length === 0) return 0;
  const sub = String(uploadedBySub || "").trim();
  if (!sub) return 0;
  return attachments.filter((a) => String(a?.uploadedBySub || "") === sub).length;
}

/**
 * @param {File[]} newFiles
 * @param {{ pendingFiles?: File[], existingServerCount?: number, t?: (key: string, params?: object) => string }} [options]
 * @returns {{ valid: File[], errors: string[] }}
 */
export function validateTicketAttachments(newFiles, options = {}) {
  const pendingFiles = Array.isArray(options.pendingFiles) ? options.pendingFiles : [];
  const existingServerCount = Math.max(0, Number(options.existingServerCount) || 0);
  const { t } = options;

  const errors = [];
  const incoming = Array.isArray(newFiles) ? newFiles : [];
  if (incoming.length === 0) {
    return { valid: [], errors: [] };
  }

  const startCount = existingServerCount + pendingFiles.length;
  if (startCount >= MAX_FILES_PER_USER) {
    errors.push(
      translate(
        t,
        "attachments.slotFull",
        { max: MAX_FILES_PER_USER },
        `You can attach at most ${MAX_FILES_PER_USER} files on this ticket.`,
      ),
    );
    return { valid: [], errors };
  }

  const valid = [];

  for (const file of incoming) {
    if (existingServerCount + pendingFiles.length + valid.length >= MAX_FILES_PER_USER) {
      errors.push(
        translate(
          t,
          "attachments.extraNotAdded",
          { max: MAX_FILES_PER_USER },
          `You can attach at most ${MAX_FILES_PER_USER} files on this ticket. Extra files were not added.`,
        ),
      );
      break;
    }

    const ext = fileExt(file.name);
    if (!EXT_ALLOW.has(ext)) {
      errors.push(
        translate(
          t,
          "attachments.typeNotAllowed",
          { fileName: file.name, types: TYPES_LABEL },
          `${file.name}: type not allowed. Use: ${TYPES_LABEL}`,
        ),
      );
      continue;
    }

    const size = file.size || 0;
    if (size > MAX_BYTES_PER_FILE) {
      errors.push(
        translate(
          t,
          "attachments.fileTooLarge",
          { fileName: file.name, maxMb: MAX_MB },
          `${file.name} exceeds ${MAX_MB}MB.`,
        ),
      );
      continue;
    }

    valid.push(file);
  }

  return { valid, errors };
}

/** @deprecated Use ATTACHMENT_POLICY — kept for existing imports */
export const customerAttachmentConstants = {
  MAX_FILES: ATTACHMENT_POLICY.MAX_FILES_PER_USER,
  MAX_BYTES_PER_FILE: ATTACHMENT_POLICY.MAX_BYTES_PER_FILE,
  EXT_ALLOW: ATTACHMENT_POLICY.ALLOWED_EXTENSIONS,
  acceptInput: ATTACHMENT_POLICY.acceptInput,
};

/**
 * @param {File[]} newFiles
 * @param {File[]} [pendingFiles]
 * @param {number} [existingServerCount]
 * @param {(key: string, params?: object) => string} [t]
 */
export function validateCustomerReplyAttachments(
  newFiles,
  pendingFiles = [],
  existingServerCount = 0,
  t,
) {
  return validateTicketAttachments(newFiles, { pendingFiles, existingServerCount, t });
}
