import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  assignToMe,
  createTicket,
  deleteTicketAsManager,
  getMe,
  getTicket,
  getToken,
  postComment,
  postTicketAction,
  resolveTicket,
  waitForTicketStatus,
} from './helpers/api';
import {
  attemptDuplicateProcessStart,
  getProcessVariables,
  waitForActiveProcess,
  waitForCompletedProcess,
  waitForProcessVariables,
} from './helpers/jbpm';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;

const createdTicketIds: number[] = [];

test.beforeAll(() => {
  if (!customerEmail || !agentEmail) {
    throw new Error('Missing CUSTOMER_* or AGENT_* in .env.test');
  }
});

test.afterAll(async () => {
  if (!managerEmail || !managerPassword) return;
  const managerToken = await getToken(managerEmail, managerPassword);
  for (const id of createdTicketIds) {
    await deleteTicketAsManager(managerToken, id);
  }
});

function track(id: number) {
  createdTicketIds.push(id);
}

test.describe.configure({ mode: 'serial' });

test.describe('P0 jBPM state machine', () => {
  test('TC-JBPM-001 · process starts with ticket correlation key', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `JBPM-001 ${Date.now()}`);
    track(ticket.id);

    const process = await waitForActiveProcess(ticket.id);
    expect(process.processInstanceId).toBeGreaterThan(0);
    expect(process.correlationKey ?? String(ticket.id)).toBe(String(ticket.id));

    const vars = await getProcessVariables(process.processInstanceId);
    expect(String(vars.ticketId)).toBe(String(ticket.id));
    expect(vars.currentStatus).toBe('NEW');
  });

  test('TC-JBPM-002 · duplicate process start returns 409', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `JBPM-002 ${Date.now()}`);
    track(ticket.id);

    await waitForActiveProcess(ticket.id);
    const status = await attemptDuplicateProcessStart(ticket.id);
    expect(status).toBe(409);
  });

  test('TC-JBPM-003 · ASSIGNED signal sets IN_PROGRESS and assigneeId', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent = await getMe(agentToken);

    const ticket = await createTicket(customerToken, `JBPM-003 ${Date.now()}`);
    track(ticket.id);

    const process = await waitForActiveProcess(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const vars = await waitForProcessVariables(
      process.processInstanceId,
      (v) => v.currentStatus === 'IN_PROGRESS' && v.assigneeId != null,
    );
    expect(String(vars.assigneeId)).toBe(String(agent.id));
  });

  test('TC-JBPM-004 · WAITING_FOR_CUSTOMER pauses SLA in jBPM', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `JBPM-004 ${Date.now()}`);
    track(ticket.id);

    const process = await waitForActiveProcess(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const waitResponse = await postTicketAction(agentToken, ticket.id, 'wait-for-customer');
    expect(waitResponse.status).toBe(202);
    await waitForTicketStatus(agentToken, ticket.id, 'WAITING_FOR_CUSTOMER');

    const vars = await waitForProcessVariables(
      process.processInstanceId,
      (v) => v.currentStatus === 'WAITING_FOR_CUSTOMER' && v.slaPaused === true,
    );
    expect(vars.waitingStartedAt).toBeTruthy();
  });

  test('TC-JBPM-005 · customer reply resumes SLA (RESUMED)', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `JBPM-005 ${Date.now()}`);
    track(ticket.id);

    const process = await waitForActiveProcess(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    await postTicketAction(agentToken, ticket.id, 'wait-for-customer');
    await waitForTicketStatus(agentToken, ticket.id, 'WAITING_FOR_CUSTOMER');
    await waitForProcessVariables(process.processInstanceId, (v) => v.slaPaused === true);

    await postComment(customerToken, ticket.id, 'Customer follow-up for JBPM-005 resume test.');
    await waitForTicketStatus(customerToken, ticket.id, 'IN_PROGRESS');

    const vars = await waitForProcessVariables(
      process.processInstanceId,
      (v) => v.currentStatus === 'IN_PROGRESS' && v.slaPaused === false,
    );
    expect(Number(vars.totalPausedDuration ?? 0)).toBeGreaterThanOrEqual(0);
  });

  test('TC-JBPM-006 · RESOLVED signal sets resolvedAt', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `JBPM-006 ${Date.now()}`);
    track(ticket.id);

    const process = await waitForActiveProcess(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    await resolveTicket(agentToken, ticket.id, 'JBPM-006 resolution note for jBPM variable check.');
    await waitForTicketStatus(agentToken, ticket.id, 'RESOLVED');

    const vars = await waitForProcessVariables(
      process.processInstanceId,
      (v) => v.currentStatus === 'RESOLVED' && v.resolvedAt != null && v.resolvedAt !== '',
    );
    expect(vars.resolvedAt).toBeTruthy();
  });

  test('TC-JBPM-007 · CUSTOMER_APPROVED completes process', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `JBPM-007 ${Date.now()}`);
    track(ticket.id);

    await waitForActiveProcess(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'JBPM-007 proposed solution for customer approval.');
    await waitForTicketStatus(agentToken, ticket.id, 'RESOLVED');

    const approveResponse = await postTicketAction(customerToken, ticket.id, 'approve');
    expect(approveResponse.status).toBe(202);
    await waitForTicketStatus(customerToken, ticket.id, 'CLOSED');

    const completed = await waitForCompletedProcess(ticket.id);
    expect([2, 3]).toContain(completed.state);

    const closedTicket = await waitForTicketStatus(customerToken, ticket.id, 'CLOSED');
    expect(closedTicket.status).toBe('CLOSED');
  });

  test('TC-JBPM-008 · CUSTOMER_REJECTED returns to IN_PROGRESS', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `JBPM-008 ${Date.now()}`);
    track(ticket.id);

    const process = await waitForActiveProcess(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'JBPM-008 proposed solution to be rejected.');
    await waitForTicketStatus(agentToken, ticket.id, 'RESOLVED');

    const rejectResponse = await postTicketAction(customerToken, ticket.id, 'reject', {
      reason: 'Issue still persists after proposed fix.',
    });
    expect(rejectResponse.status).toBe(202);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const vars = await waitForProcessVariables(
      process.processInstanceId,
      (v) =>
        v.currentStatus === 'IN_PROGRESS' &&
        typeof v.customerRejectionNote === 'string' &&
        String(v.customerRejectionNote).includes('Issue still persists'),
    );
    expect(vars.customerRejectionNote).toBeTruthy();
  });

  test('TC-JBPM-009 · FORCE_CLOSED completes process with closureReason', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `JBPM-009 ${Date.now()}`);
    track(ticket.id);

    await waitForActiveProcess(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const closeResponse = await postTicketAction(agentToken, ticket.id, 'close', {
      closureReason: 'INVALID',
    });
    expect(closeResponse.status).toBe(202);
    await waitForTicketStatus(agentToken, ticket.id, 'CLOSED');

    const completed = await waitForCompletedProcess(ticket.id);
    expect([2, 3]).toContain(completed.state);

    const closed = await getTicket(agentToken, ticket.id);
    expect(closed.status).toBe('CLOSED');
    expect((closed as { closureReason?: string }).closureReason).toBe('INVALID');
  });
});
