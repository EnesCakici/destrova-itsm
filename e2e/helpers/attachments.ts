const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080/api';

export interface AttachmentDto {
  id: number;
  ticketId: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedBySub?: string;
  isInternal?: boolean;
}

export function makeBuffer(sizeBytes: number, prefix = ''): Buffer {
  const head = Buffer.from(prefix);
  const padding = Buffer.alloc(Math.max(0, sizeBytes - head.length), 0x20);
  return Buffer.concat([head, padding]);
}

export function makePdfBuffer(sizeBytes: number): Buffer {
  return makeBuffer(sizeBytes, '%PDF-1.4\n');
}

function buildMultipartBody(
  fileName: string,
  content: Buffer,
  internal: boolean,
): { body: Buffer; contentType: string } {
  const boundary = `----DestrovaE2E${Date.now()}`;
  const parts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`,
    ),
    content,
    Buffer.from('\r\n'),
  ];
  if (internal) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="internal"\r\n\r\n` +
          `true\r\n`,
      ),
    );
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export async function uploadAttachment(
  token: string,
  ticketId: number,
  fileName: string,
  content: Buffer,
  internal = false,
  init: Pick<RequestInit, 'signal'> = {},
): Promise<Response> {
  const { body, contentType } = buildMultipartBody(fileName, content, internal);
  return fetch(`${apiBaseUrl}/tickets/${ticketId}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
    },
    body: new Uint8Array(body),
    signal: init.signal,
  });
}

export async function downloadAttachment(
  token: string,
  ticketId: number,
  attachmentId: number,
): Promise<Response> {
  return fetch(`${apiBaseUrl}/tickets/${ticketId}/attachments/${attachmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listAttachments(
  token: string,
  ticketId: number,
): Promise<Response> {
  return fetch(`${apiBaseUrl}/tickets/${ticketId}/attachments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
