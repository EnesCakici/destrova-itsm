import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  AttachmentDto,
  downloadAttachment,
  listAttachments,
  makePdfBuffer,
  uploadAttachment,
} from './helpers/attachments';
import { createTicket, deleteTicketAsManager, getToken } from './helpers/api';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const customer2Email = process.env.CUSTOMER2_EMAIL ?? 'customer2@ticket.com';
const customer2Password = process.env.CUSTOMER2_PASSWORD ?? '123456';
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;

const createdTicketIds: number[] = [];

test.beforeAll(() => {
  if (!customerEmail || !customerPassword) {
    throw new Error('Missing CUSTOMER_* credentials in .env.test');
  }
});

test.afterAll(async () => {
  if (!managerEmail || !managerPassword || createdTicketIds.length === 0) {
    return;
  }
  const managerToken = await getToken(managerEmail, managerPassword);
  for (const id of createdTicketIds) {
    await deleteTicketAsManager(managerToken, id);
  }
});

function track(id: number) {
  createdTicketIds.push(id);
}

test.describe.configure({ mode: 'serial' });

test.describe('P3 Attachments', () => {
  test('TC-ATTACH-001 · upload PDF — success', async () => {
    test.setTimeout(60_000);

    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `ATTACH-001 ${Date.now()}`);
    track(ticket.id);

    // Matrix: ~1 MB PDF; 256 KB keeps E2E fast while exercising multipart upload.
    const pdf = makePdfBuffer(256 * 1024);
    const response = await uploadAttachment(
      customerToken,
      ticket.id,
      'e2e-report.pdf',
      pdf,
      false,
      { signal: AbortSignal.timeout(30_000) },
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as AttachmentDto;
    expect(body.id).toBeTruthy();
    expect(body.ticketId).toBe(ticket.id);
    expect(body.fileName).toContain('.pdf');
    expect(body.filePath).toBeTruthy();
    expect(body.fileSize).toBe(pdf.length);

    const listResponse = await listAttachments(customerToken, ticket.id);
    expect(listResponse.status).toBe(200);
    const listed = (await listResponse.json()) as AttachmentDto[];
    expect(listed.some((a) => a.id === body.id)).toBe(true);
  });

  test('TC-ATTACH-002 · disallowed file type (.exe)', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `ATTACH-002 ${Date.now()}`);
    track(ticket.id);

    const response = await uploadAttachment(
      customerToken,
      ticket.id,
      'malware.exe',
      Buffer.from('MZ fake exe'),
    );

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text.toLowerCase()).toMatch(/not allowed|file type/);
  });

  test('TC-ATTACH-003 · file exceeds size limit', async () => {
    test.setTimeout(90_000);

    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `ATTACH-003 ${Date.now()}`);
    track(ticket.id);

    // Spring multipart limit is 10 MB; client must send the overflow before server rejects.
    const tenMb = 10 * 1024 * 1024;
    const oversized = makePdfBuffer(tenMb + 512);
    const response = await uploadAttachment(
      customerToken,
      ticket.id,
      'too-large.pdf',
      oversized,
      false,
      { signal: AbortSignal.timeout(75_000) },
    );

    expect([400, 413]).toContain(response.status);
  });

  test('TC-ATTACH-004 · cross-customer attachment access denied', async () => {
    const customer1Token = await getToken(customerEmail, customerPassword);
    const customer2Token = await getToken(customer2Email, customer2Password);

    const ticket = await createTicket(customer1Token, `ATTACH-004 ${Date.now()}`);
    track(ticket.id);

    const uploadResponse = await uploadAttachment(
      customer1Token,
      ticket.id,
      'private-note.txt',
      Buffer.from('customer1 attachment'),
    );
    expect(uploadResponse.status).toBe(201);
    const attachment = (await uploadResponse.json()) as AttachmentDto;

    const downloadResponse = await downloadAttachment(customer2Token, ticket.id, attachment.id);
    expect(downloadResponse.status).toBe(403);

    const listResponse = await listAttachments(customer2Token, ticket.id);
    expect(listResponse.status).toBe(403);
  });
});
