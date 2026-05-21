/**
 * Customer reply attachment rules (align with product limits).
 * Allowed: jpg, jpeg, png, pdf, txt, log, zip — max 5 files, 10MB total.
 */

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10 MB
const EXT_ALLOW = new Set(["jpg", "jpeg", "png", "pdf", "txt", "log", "zip"]);

function fileExt(name) {
  const m = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/**
 * @param {File[]} newFiles
 * @param {File[]} existing
 * @returns {{ valid: File[], errors: string[] }}
 */
export function validateCustomerReplyAttachments(newFiles, existing = []) {
  const errors = [];
  const existingArr = Array.isArray(existing) ? existing : [];
  const incoming = Array.isArray(newFiles) ? newFiles : [];
  if (incoming.length === 0) {
    return { valid: [], errors: [] };
  }

  let startCount = existingArr.length;
  if (startCount >= MAX_FILES) {
    errors.push(`You can attach at most ${MAX_FILES} files. Remove some to add more.`);
    return { valid: [], errors };
  }

  const valid = [];
  let runningTotal = existingArr.reduce((s, f) => s + (f.size || 0), 0);

  for (const file of incoming) {
    if (startCount + valid.length >= MAX_FILES) {
      errors.push(`Only ${MAX_FILES} files allowed. Extra files were not added.`);
      break;
    }
    const ext = fileExt(file.name);
    if (!EXT_ALLOW.has(ext)) {
      errors.push(
        `${file.name}: type not allowed. Use: ${[...EXT_ALLOW].join(", ")}`,
      );
      continue;
    }
    const size = file.size || 0;
    if (size > MAX_TOTAL_BYTES) {
      errors.push(`${file.name} exceeds 10MB.`);
      continue;
    }
    if (runningTotal + size > MAX_TOTAL_BYTES) {
      errors.push("Total size of attachments would exceed 10MB.");
      break;
    }
    runningTotal += size;
    valid.push(file);
  }

  return { valid, errors };
}

export const customerAttachmentConstants = {
  MAX_FILES,
  MAX_TOTAL_BYTES,
  EXT_ALLOW: [...EXT_ALLOW],
  acceptInput: ".jpg,.jpeg,.png,.pdf,.txt,.log,.zip,image/jpeg,image/png,application/pdf,text/plain,application/zip",
};
