import { apiRequest } from './api';

export interface NotificationDto {
  id: number;
  userId: number;
  relatedTicketId: number;
  message: string;
  type: string;
  read: boolean;
}

export function notificationHeadline(message: string): string {
  const match = message.match(/#\d+ — (.+)\|\|\|/);
  return match?.[1] ?? '';
}

export async function listNotifications(token: string): Promise<NotificationDto[]> {
  const response = await apiRequest('/notifications', token);
  if (!response.ok) {
    throw new Error(`GET /notifications failed: ${response.status}`);
  }
  return (await response.json()) as NotificationDto[];
}

export async function getUnreadCount(token: string): Promise<number> {
  const response = await apiRequest('/notifications/unread-count', token);
  if (!response.ok) {
    throw new Error(`GET /notifications/unread-count failed: ${response.status}`);
  }
  return (await response.json()) as number;
}

export async function markNotificationRead(token: string, notificationId: number): Promise<number> {
  return apiRequest(`/notifications/${notificationId}/read`, token, { method: 'PATCH' }).then((r) => r.status);
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  const response = await apiRequest('/notifications/read-all', token, { method: 'PATCH' });
  if (response.status !== 204) {
    throw new Error(`PATCH /notifications/read-all failed: ${response.status}`);
  }
}

export async function waitForNotification(
  token: string,
  predicate: (notification: NotificationDto) => boolean,
  timeoutMs = 20_000,
): Promise<NotificationDto> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await listNotifications(token);
    const found = list.find(predicate);
    if (found) {
      return found;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Notification matching predicate not found within timeout');
}

export async function waitForTicketNotification(
  token: string,
  ticketId: number,
  predicate: (notification: NotificationDto) => boolean,
  timeoutMs = 20_000,
): Promise<NotificationDto> {
  return waitForNotification(
    token,
    (n) => n.relatedTicketId === ticketId && predicate(n),
    timeoutMs,
  );
}

export async function waitForUnreadAtLeast(
  token: string,
  minCount: number,
  timeoutMs = 20_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const count = await getUnreadCount(token);
    if (count >= minCount) {
      return count;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Unread count did not reach ${minCount} within ${timeoutMs}ms`);
}

export async function waitForMailhogSubject(
  subjectContains: string,
  timeoutMs = 20_000,
): Promise<void> {
  const mailhogBase = process.env.MAILHOG_URL ?? 'http://localhost:8025';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${mailhogBase}/api/v2/messages`);
    if (response.ok) {
      const body = (await response.json()) as {
        items?: Array<{ Content?: { Headers?: { Subject?: string[] } } }>;
      };
      const found = body.items?.some((item) =>
        (item.Content?.Headers?.Subject?.[0] ?? '').includes(subjectContains),
      );
      if (found) {
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Mailhog message with subject containing "${subjectContains}" not found`);
}
