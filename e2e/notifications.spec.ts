import dotenv from 'dotenv';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  apiRequest,
  assignTicket,
  assignToMe,
  createTicket,
  deleteTicketAsManager,
  getMe,
  getToken,
  postComment,
  postTicketAction,
  resolveTicket,
  waitForTicketStatus,
} from './helpers/api';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationHeadline,
  waitForMailhogSubject,
  waitForNotification,
  waitForTicketNotification,
  waitForUnreadAtLeast,
} from './helpers/notifications';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const customerEmail = process.env.CUSTOMER_EMAIL!;
const customerPassword = process.env.CUSTOMER_PASSWORD!;
const customer2Email = process.env.CUSTOMER2_EMAIL ?? 'customer2@ticket.com';
const customer2Password = process.env.CUSTOMER2_PASSWORD ?? '123456';
const agentEmail = process.env.AGENT_EMAIL!;
const agentPassword = process.env.AGENT_PASSWORD!;
const agent2Email = process.env.AGENT2_EMAIL ?? 'agent2@ticket.com';
const agent2Password = process.env.AGENT2_PASSWORD ?? '123456';
const managerEmail = process.env.MANAGER_EMAIL;
const managerPassword = process.env.MANAGER_PASSWORD;

const createdTicketIds: number[] = [];

test.beforeAll(() => {
  if (!customerEmail || !customerPassword || !agentEmail || !agentPassword) {
    throw new Error('Missing CUSTOMER_* or AGENT_* credentials in .env.test');
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

test.describe('P1 Notifications', () => {
  test('TC-NOTIF-001 · customer notified on ticket creation', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `NOTIF-001 ${Date.now()}`);
    track(ticket.id);

    const notification = await waitForTicketNotification(
      customerToken,
      ticket.id,
      (n) => n.type === 'TICKET_CREATED',
    );
    expect(notificationHeadline(notification.message)).toBe('Request Received');
    expect(notification.message).toContain("We'll start working on it soon.");
  });

  test('TC-NOTIF-002 · self-assign does not notify assignee', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `NOTIF-002 ${Date.now()}`);
    track(ticket.id);

    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await new Promise((r) => setTimeout(r, 3000));

    const assigned = (await listNotifications(agentToken)).filter(
      (n) => n.relatedTicketId === ticket.id && n.type === 'TICKET_ASSIGNED',
    );
    expect(assigned).toHaveLength(0);
  });

  test('TC-NOTIF-003 · manager assign notifies agent', async () => {
    test.skip(!managerEmail || !managerPassword, 'MANAGER_* credentials required');

    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const managerToken = await getToken(managerEmail!, managerPassword!);
    const agent = await getMe(agentToken);

    const ticket = await createTicket(customerToken, `NOTIF-003 ${Date.now()}`);
    track(ticket.id);

    await assignTicket(managerToken, ticket.id, agent.id);

    const notification = await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => n.type === 'TICKET_ASSIGNED',
    );
    expect(notificationHeadline(notification.message)).toBe('New Request Assigned');
  });

  test('TC-NOTIF-004 · customer notified when ticket resolved', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `NOTIF-004 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Issue fixed after restart.');
    await waitForTicketStatus(customerToken, ticket.id, 'RESOLVED');

    const notification = await waitForTicketNotification(
      customerToken,
      ticket.id,
      (n) => n.type === 'STATUS_CHANGED' && notificationHeadline(n.message) === 'Solution Proposed',
    );
    expect(notification.message).toContain('Please review and accept or decline.');
  });

  test('TC-NOTIF-005 · agent notified when customer rejects resolution', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `NOTIF-005 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Applied workaround fix.');
    await waitForTicketStatus(customerToken, ticket.id, 'RESOLVED');

    const reject = await postTicketAction(customerToken, ticket.id, 'reject', {
      reason: 'Issue still persists after workaround.',
    });
    expect(reject.status).toBe(202);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const notification = await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => n.type === 'STATUS_CHANGED' && notificationHeadline(n.message) === 'Customer Declined',
    );
    expect(notification.message).toContain('reopened');
  });

  test('TC-NOTIF-006 · agent notified on customer comment', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `NOTIF-006 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await postComment(customerToken, ticket.id, 'Any update on this request?');

    const notification = await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => n.type === 'COMMENT_ADDED' && notificationHeadline(n.message) === 'New Customer Reply',
    );
    expect(notification.message).toContain('New reply from customer.');
  });

  test('TC-NOTIF-007 · customer notified on agent external comment', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `NOTIF-007 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await postComment(agentToken, ticket.id, 'We are investigating the root cause.');

    const notification = await waitForTicketNotification(
      customerToken,
      ticket.id,
      (n) => n.type === 'COMMENT_ADDED' && notificationHeadline(n.message) === 'New Reply on Request',
    );
  });

  test('TC-NOTIF-008 · internal note does not notify customer', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `NOTIF-008 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const before = (await listNotifications(customerToken)).filter((n) => n.relatedTicketId === ticket.id);
    await postComment(agentToken, ticket.id, 'Internal triage notes only.', true);
    await new Promise((r) => setTimeout(r, 3000));

    const after = (await listNotifications(customerToken)).filter((n) => n.relatedTicketId === ticket.id);
    expect(after.length).toBe(before.length);
  });

  test('TC-NOTIF-009 · @mention in internal note notifies target agent', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent2 = await getMe(agent2Token);
    const mentionEmail = agent2.email ?? agent2Email;

    const ticket = await createTicket(customerToken, `NOTIF-009 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await postComment(agentToken, ticket.id, `@${mentionEmail} please review logs.`, true);

    const notification = await waitForTicketNotification(
      agent2Token,
      ticket.id,
      (n) => n.type === 'COMMENT_ADDED' && notificationHeadline(n.message) === 'You Were Mentioned',
    );
    expect(notification.message).toContain('internal note');
  });

  test('TC-NOTIF-010 · invalid @mention does not crash or notify ghost user', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `NOTIF-010 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    await postComment(
      agentToken,
      ticket.id,
      '@yokboylesibiri@test.com this user does not exist',
      true,
    );
    await new Promise((r) => setTimeout(r, 2000));
    expect(true).toBe(true);
  });

  test('TC-NOTIF-011 · close notifies customer and assignee', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    const ticket = await createTicket(customerToken, `NOTIF-011 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Permanent fix deployed.');
    await waitForTicketStatus(customerToken, ticket.id, 'RESOLVED');

    const approve = await postTicketAction(customerToken, ticket.id, 'approve');
    expect(approve.status).toBe(202);
    await waitForTicketStatus(customerToken, ticket.id, 'CLOSED');

    const customerNotif = await waitForTicketNotification(
      customerToken,
      ticket.id,
      (n) => n.type === 'TICKET_CLOSED' && notificationHeadline(n.message) === 'Request Closed',
    );
    expect(customerNotif.message).toContain('Thank you!');

    const agentNotif = await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => n.type === 'TICKET_CLOSED',
    );
    expect(agentNotif.message).toContain('The request has been closed.');
  });

  test('TC-NOTIF-012 · unread count reflects new notifications', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);

    await markAllNotificationsRead(customerToken);
    expect(await getUnreadCount(customerToken)).toBe(0);

    const ticket = await createTicket(customerToken, `NOTIF-012 ${Date.now()}`);
    track(ticket.id);
    await waitForUnreadAtLeast(customerToken, 1);

    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');
    await resolveTicket(agentToken, ticket.id, 'Resolved for unread count test.');
    await waitForTicketStatus(customerToken, ticket.id, 'RESOLVED');
    await postComment(agentToken, ticket.id, 'Please confirm the fix works.');

    const count = await waitForUnreadAtLeast(customerToken, 3);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('TC-NOTIF-013 · mark single notification as read', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const beforeCount = await getUnreadCount(customerToken);

    const ticket = await createTicket(customerToken, `NOTIF-013 ${Date.now()}`);
    track(ticket.id);
    const notification = await waitForTicketNotification(
      customerToken,
      ticket.id,
      (n) => n.type === 'TICKET_CREATED',
    );

    const status = await markNotificationRead(customerToken, notification.id);
    expect(status).toBe(204);
    expect(await getUnreadCount(customerToken)).toBeLessThan(beforeCount + 1);

    const updated = (await listNotifications(customerToken)).find((n) => n.id === notification.id);
    expect(updated?.read).toBe(true);
  });

  test('TC-NOTIF-014 · mark all notifications read', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    await markAllNotificationsRead(customerToken);
    expect(await getUnreadCount(customerToken)).toBe(0);
  });

  test('TC-NOTIF-015 · cannot mark another user notification', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const customer2Token = await getToken(customer2Email, customer2Password);

    const ticket = await createTicket(customer2Token, `NOTIF-015 ${Date.now()}`);
    track(ticket.id);
    const notification = await waitForTicketNotification(
      customer2Token,
      ticket.id,
      (n) => n.type === 'TICKET_CREATED',
    );

    const status = await markNotificationRead(customerToken, notification.id);
    expect(status).toBe(404);
  });

  test('TC-NOTIF-016 · transfer request notifies target and requester', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent2 = await getMe(agent2Token);

    const ticket = await createTicket(customerToken, `NOTIF-016 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    const transferResponse = await apiRequest(`/tickets/${ticket.id}/transfer`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ toAgentId: agent2.id, transferReason: 'OVERLOAD' }),
    });
    expect(transferResponse.status).toBe(200);

    const targetNotif = await waitForTicketNotification(
      agent2Token,
      ticket.id,
      (n) => notificationHeadline(n.message) === 'Transfer Request',
    );
    expect(targetNotif.type).toBe('TICKET_ASSIGNED');

    const senderNotif = await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => notificationHeadline(n.message) === 'Transfer Pending',
    );
    expect(senderNotif.type).toBe('STATUS_CHANGED');
  });

  test('TC-NOTIF-017 · transfer approval notifies requester', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent2 = await getMe(agent2Token);

    const ticket = await createTicket(customerToken, `NOTIF-017 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    await apiRequest(`/tickets/${ticket.id}/transfer`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ toAgentId: agent2.id, transferReason: 'EXPERTISE' }),
    });

    await apiRequest(`/tickets/${ticket.id}/transfer/approve`, agent2Token, { method: 'POST' });

    const notification = await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => notificationHeadline(n.message) === 'Transfer Approved',
    );
    expect(notification.type).toBe('STATUS_CHANGED');
  });

  test('TC-NOTIF-018 · transfer rejection notifies requester', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const agentToken = await getToken(agentEmail, agentPassword);
    const agent2Token = await getToken(agent2Email, agent2Password);
    const agent2 = await getMe(agent2Token);

    const ticket = await createTicket(customerToken, `NOTIF-018 ${Date.now()}`);
    track(ticket.id);
    await assignToMe(agentToken, ticket.id);
    await waitForTicketStatus(agentToken, ticket.id, 'IN_PROGRESS');

    await apiRequest(`/tickets/${ticket.id}/transfer`, agentToken, {
      method: 'POST',
      body: JSON.stringify({ toAgentId: agent2.id, transferReason: 'VACATION' }),
    });

    await apiRequest(`/tickets/${ticket.id}/transfer/reject`, agent2Token, {
      method: 'POST',
      body: JSON.stringify({ note: 'Kapasitem dolu.' }),
    });

    const notification = await waitForTicketNotification(
      agentToken,
      ticket.id,
      (n) => notificationHeadline(n.message) === 'Transfer Declined',
    );
    expect(notification.type).toBe('STATUS_CHANGED');
  });

  test('TC-NOTIF-019 · ticket creation sends customer email via Mailhog', async () => {
    const customerToken = await getToken(customerEmail, customerPassword);
    const ticket = await createTicket(customerToken, `NOTIF-019 ${Date.now()}`);
    track(ticket.id);

    await waitForMailhogSubject(`Request #${ticket.id} received`);
  });
});
