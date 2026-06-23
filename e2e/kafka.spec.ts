import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  apiRequest,
  approveTransfer,
  assignToMe,
  assignTicket,
  createTicket,
  deleteTicketAsManager,
  ensureAgentHeadroom,
  getMe,
  getToken,
  postTicketAction,
  rejectTransfer,
  resolveTicket,
  transferTicket,
  waitForTicketStatus,
} from './helpers/api';
import {
  isKafkaReachable,
  isOpenSearchReachable,
  waitForKafkaLogAfter,
  waitForOpenSearchLog,
} from './helpers/kafka';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
const agent2Email = process.env.AGENT2_EMAIL ?? 'agent2@ticket.com';
const agent2Password = process.env.AGENT2_PASSWORD ?? '123456';
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;

const createdTicketIds: number[] = [];
let kafkaAvailable = false;
let openSearchAvailable = false;

test.beforeAll(async () => {
  if (!customerEmail || !agentEmail) {
    throw new Error('Missing CUSTOMER_* or AGENT_* in .env.test');
  }
  kafkaAvailable = await isKafkaReachable();
  openSearchAvailable = await isOpenSearchReachable();
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

test.describe('P2 Kafka log pipeline', () => {
  test.beforeEach(() => {
    test.skip(!kafkaAvailable, 'Kafka broker unreachable on localhost:9093');
  });

  test('TC-KAFKA-001 · TICKET_CREATED log', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const title = `KAFKA-001 ${Date.now()}`;

    const { result: ticket, event } = await waitForKafkaLogAfter(
      () => createTicket(customerToken, title),
      (event, ticket) =>
        event.action === 'TICKET_CREATED' &&
        event.ticketId === ticket.id &&
        event.level === 'INFO' &&
        event.serviceName === 'destrova-backend',
    );

    track(ticket.id);
    expect(event.message).toMatch(/ticket created/i);
  });

  test('TC-KAFKA-002 · TICKET_ASSIGNED log', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent = await getMe(agentToken);

    const ticket = await createTicket(customerToken, `KAFKA-002 ${Date.now()}`);
    track(ticket.id);

    const { event } = await waitForKafkaLogAfter(
      () => assignTicket(managerToken, ticket.id, agent.id),
      (event, assigned) =>
        event.action === 'TICKET_ASSIGNED' &&
        event.ticketId === assigned.id &&
        event.level === 'INFO',
    );

    expect(event.message).toMatch(/assigned/i);
  });

  test('TC-KAFKA-003 · STATUS_CHANGED log', async () => {
    test.skip(
      true,
      'Backend gap: STATUS_CHANGED Kafka log is only emitted on legacy PUT updates; jBPM workflow actions do not publish it.',
    );

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `KAFKA-003 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const { event } = await waitForKafkaLogAfter(
      async () => {
        const response = await postTicketAction(agentToken, ticket.id, 'wait-for-customer');
        expect(response.status).toBe(202);
        await waitForTicketStatus(agentToken, ticket.id, 'WAITING_FOR_CUSTOMER');
        return ticket;
      },
      (event, current) =>
        event.action === 'STATUS_CHANGED' &&
        event.ticketId === current.id &&
        Boolean(event.message?.includes('In progress') && event.message?.includes('Waiting for you')),
    );

    expect(event.level).toBe('INFO');
  });

  test('TC-KAFKA-004 · TICKET_CLOSED log', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `KAFKA-004 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Kafka close path verified.');
    await waitForTicketStatus(customerToken, ticket.id, 'RESOLVED');

    const { event } = await waitForKafkaLogAfter(
      async () => {
        const response = await apiRequest(`/tickets/${ticket.id}/approve`, customerToken, {
          method: 'POST',
        });
        expect(response.ok).toBe(true);
        await waitForTicketStatus(customerToken, ticket.id, 'CLOSED');
        return ticket;
      },
      (event, current) =>
        event.action === 'TICKET_CLOSED' &&
        event.ticketId === current.id &&
        event.level === 'INFO',
    );

    expect(event.message).toMatch(/closed/i);
  });

  test('TC-KAFKA-005 · customer rejection emits WARN STATUS_CHANGED', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `KAFKA-005 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Proposed fix for kafka rejection test.');
    await waitForTicketStatus(customerToken, ticket.id, 'RESOLVED');

    const { event } = await waitForKafkaLogAfter(
      async () => {
        const response = await apiRequest(`/tickets/${ticket.id}/reject`, customerToken, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Still broken after proposed fix.' }),
        });
        expect(response.ok).toBe(true);
        await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
        return ticket;
      },
      (event, current) =>
        event.action === 'STATUS_CHANGED' &&
        event.ticketId === current.id &&
        event.level === 'WARN' &&
        event.message === 'Ticket reopened by customer rejection',
    );

    expect(event.serviceName).toBe('destrova-backend');
  });

  test('TC-KAFKA-006 · transfer flow Kafka actions', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent1 = await getMe(agentToken);
    const agent2 = await getMe(agent2Token);
    await ensureAgentHeadroom(managerToken, agent2.id, 5);

    const requestedTicket = await createTicket(customerToken, `KAFKA-006-req ${Date.now()}`);
    track(requestedTicket.id);
    await assignToMe(agentToken, requestedTicket.id);
    await waitForTicketStatus(agentToken, requestedTicket.id, 'IN_PROGRESS');

    const requested = await waitForKafkaLogAfter(
      () =>
        transferTicket(agentToken, requestedTicket.id, {
          toAgentId: agent2.id,
          transferReason: 'OVERLOAD',
        }),
      (event, row) =>
        event.action === 'TICKET_TRANSFER_REQUESTED' && event.ticketId === row.id,
    );
    expect(requested.event.level).toBe('INFO');

    const approvedTicket = await createTicket(customerToken, `KAFKA-006-appr ${Date.now()}`);
    track(approvedTicket.id);
    await assignToMe(agentToken, approvedTicket.id);
    await waitForTicketStatus(agentToken, approvedTicket.id, 'IN_PROGRESS');
    await transferTicket(agentToken, approvedTicket.id, {
      toAgentId: agent2.id,
      transferReason: 'EXPERTISE',
    });

    const approved = await waitForKafkaLogAfter(
      () => approveTransfer(agent2Token, approvedTicket.id),
      (event, row) =>
        event.action === 'TICKET_TRANSFER_APPROVED' && event.ticketId === row.id,
    );
    expect(approved.event.message).toMatch(/approved/i);

    const rejectedTicket = await createTicket(customerToken, `KAFKA-006-rej ${Date.now()}`);
    track(rejectedTicket.id);
    await assignToMe(agentToken, rejectedTicket.id);
    await waitForTicketStatus(agentToken, rejectedTicket.id, 'IN_PROGRESS');
    await transferTicket(agentToken, rejectedTicket.id, {
      toAgentId: agent2.id,
      transferReason: 'VACATION',
    });

    const rejected = await waitForKafkaLogAfter(
      () => rejectTransfer(agent2Token, rejectedTicket.id, 'Cannot take more tickets now.'),
      (event, row) =>
        event.action === 'TICKET_TRANSFER_REJECTED' && event.ticketId === row.id,
    );
    expect(rejected.event.message).toMatch(/declined/i);
    void agent1;
  });

  test.skip('TC-KAFKA-007 · graceful degradation when broker is down', async () => {
    // Infra test: stop Kafka container, create ticket, expect HTTP 201 and no backend crash.
  });

  test('TC-KAFKA-008 · log-consumer indexes events in OpenSearch', async () => {
    test.skip(!openSearchAvailable, 'OpenSearch unreachable on localhost:9200');

    const customerToken = await getToken(customerEmail, customerPassword);
    const title = `KAFKA-008 ${Date.now()}`;
    const ticket = await createTicket(customerToken, title);
    track(ticket.id);

    const event = await waitForOpenSearchLog(ticket.id, 'TICKET_CREATED');
    expect(event.level).toBe('INFO');
    expect(event.serviceName).toBe('destrova-backend');
  });
});
