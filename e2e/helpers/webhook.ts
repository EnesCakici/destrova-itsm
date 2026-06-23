const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080/api';
const webhookSecret = process.env.WEBHOOK_SECRET ?? 'destrova-webhook-dev-secret';

export interface WebhookResponseBody {
  accepted: boolean;
  duplicate: boolean;
  ticketId: number;
  appliedAt?: string;
  error?: string;
}

function webhookHeaders(eventId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': webhookSecret,
    'X-Idempotency-Key': eventId,
  };
}

export async function postSlaUpdatedWebhook(
  ticketId: number,
  payload: { slaDueDate?: string; priority?: string; totalPausedDurationMs?: number },
  eventId = `e2e-sla-updated-${ticketId}-${Date.now()}`,
): Promise<Response> {
  return fetch(`${apiBaseUrl}/webhook/jbpm/sla-updated`, {
    method: 'POST',
    headers: webhookHeaders(eventId),
    body: JSON.stringify({
      eventId,
      eventType: 'sla-updated',
      occurredAt: new Date().toISOString(),
      ticketId,
      payload,
    }),
  });
}

export async function postSlaBreachWebhook(ticketId: number): Promise<Response> {
  const eventId = `e2e-sla-breach-${ticketId}-${Date.now()}`;
  return fetch(`${apiBaseUrl}/webhook/jbpm/sla-breach`, {
    method: 'POST',
    headers: webhookHeaders(eventId),
    body: JSON.stringify({ ticketId }),
  });
}

export async function postSlaBreachWebhookWithEventId(
  ticketId: number,
  eventId: string,
): Promise<Response> {
  return fetch(`${apiBaseUrl}/webhook/jbpm/sla-breach`, {
    method: 'POST',
    headers: webhookHeaders(eventId),
    body: JSON.stringify({
      eventId,
      eventType: 'sla-breach',
      occurredAt: new Date().toISOString(),
      ticketId,
      payload: {},
    }),
  });
}
