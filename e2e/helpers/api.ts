import { fetchKeycloakToken } from './auth';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:8080/api';

export type TicketStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'RESOLVED'
  | 'CLOSED';

export interface TicketDto {
  id: number;
  status: TicketStatus;
  assigneeId?: number | null;
  priority?: string;
  createdAt?: string;
  slaDueDate?: string;
  slaState?: string;
  totalPausedDurationMs?: number | null;
  pendingTransferToAgentId?: number | null;
}

export async function apiRequest(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${apiBaseUrl}${path}`, { ...options, headers });
}

export async function getMe(token: string): Promise<{ id: number; email?: string }> {
  const response = await apiRequest('/users/me', token);
  if (!response.ok) {
    throw new Error(`GET /users/me failed: ${response.status}`);
  }
  return (await response.json()) as { id: number; email?: string };
}

export async function createTicket(
  token: string,
  title: string,
  description = 'Security E2E test ticket.',
  priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM',
  productId?: number,
): Promise<TicketDto> {
  const response = await apiRequest('/tickets', token, {
    method: 'POST',
    body: JSON.stringify({
      title,
      description,
      priority,
      ...(productId != null ? { product: { id: productId } } : {}),
    }),
  });
  if (response.status !== 201) {
    throw new Error(`POST /tickets failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as TicketDto;
}

export async function getTicket(token: string, ticketId: number): Promise<TicketDto> {
  const response = await apiRequest(`/tickets/${ticketId}`, token);
  if (!response.ok) {
    throw new Error(`GET /tickets/${ticketId} failed: ${response.status}`);
  }
  return (await response.json()) as TicketDto;
}

export async function waitForTicketStatus(
  token: string,
  ticketId: number,
  status: TicketStatus,
  timeoutMs = 30_000,
): Promise<TicketDto> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ticket = await getTicket(token, ticketId);
    if (ticket.status === status) {
      return ticket;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Ticket #${ticketId} did not reach status ${status} within ${timeoutMs}ms`);
}

export async function assignToMeRaw(token: string, ticketId: number): Promise<Response> {
  return apiRequest(`/tickets/${ticketId}/actions/assign-to-me`, token, { method: 'POST' });
}

/** Retries assign until jBPM/workflow accepts ASSIGNED (409/503 during warm-up). */
export async function assignToMeWhenReady(
  token: string,
  ticketId: number,
  timeoutMs = 45_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastDetail = '';
  while (Date.now() < deadline) {
    const response = await assignToMeRaw(token, ticketId);
    if (response.status === 202) {
      return;
    }
    lastDetail = `${response.status} ${await response.text()}`;
    if (response.status === 409 || response.status === 400 || response.status === 503) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }
    throw new Error(`assign-to-me failed: ${lastDetail}`);
  }
  throw new Error(`assign-to-me not ready within ${timeoutMs}ms: ${lastDetail}`);
}

export async function assignToMe(token: string, ticketId: number): Promise<void> {
  await assignToMeWhenReady(token, ticketId);
}

export async function customerClose(
  token: string,
  ticketId: number,
  closureReason: string,
): Promise<Response> {
  return apiRequest(`/tickets/${ticketId}/customer-close`, token, {
    method: 'POST',
    body: JSON.stringify({ closureReason }),
  });
}

export async function resolveTicket(token: string, ticketId: number, resolutionNote: string): Promise<void> {
  const response = await apiRequest(`/tickets/${ticketId}/actions/resolve`, token, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
  if (response.status !== 202) {
    throw new Error(`resolve failed: ${response.status} ${await response.text()}`);
  }
}

export async function closeTicketForCleanup(managerToken: string, ticketId: number): Promise<void> {
  try {
    let ticket: TicketDto;
    try {
      ticket = await getTicket(managerToken, ticketId);
    } catch {
      return;
    }
    if (ticket.status === 'CLOSED') {
      return;
    }

    const response = await postTicketAction(managerToken, ticketId, 'close', {
      closureReason: 'INVALID',
    });
    if (response.status === 202) {
      await waitForTicketStatus(managerToken, ticketId, 'CLOSED', 60_000);
      return;
    }
    if (response.status === 409) {
      return;
    }
    console.warn(`[E2E cleanup] close ticket #${ticketId} → HTTP ${response.status}`);
  } catch (error) {
    console.warn(`[E2E cleanup] close ticket #${ticketId} failed: ${error}`);
  }
}

/** Closes test tickets via force-close — product has no delete in UI. */
export async function deleteTicketAsManager(managerToken: string, ticketId: number): Promise<void> {
  await closeTicketForCleanup(managerToken, ticketId);
}

export async function getToken(email: string, password: string): Promise<string> {
  const token = await fetchKeycloakToken(email, password);
  if (!token) {
    throw new Error(`Keycloak token unavailable for ${email}`);
  }
  return token;
}

export async function postComment(
  token: string,
  ticketId: number,
  message: string,
  isInternal = false,
): Promise<void> {
  const response = await apiRequest(`/tickets/${ticketId}/comments`, token, {
    method: 'POST',
    body: JSON.stringify({ message, isInternal }),
  });
  if (response.status !== 201) {
    throw new Error(`POST comment failed: ${response.status} ${await response.text()}`);
  }
}

export async function assignTicket(
  token: string,
  ticketId: number,
  assigneeId: number,
): Promise<TicketDto> {
  const response = await apiRequest(`/tickets/${ticketId}/assign`, token, {
    method: 'POST',
    body: JSON.stringify({ assigneeId }),
  });
  if (!response.ok) {
    throw new Error(`POST assign failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as TicketDto;
}

export async function transferTicket(
  token: string,
  ticketId: number,
  body: Record<string, unknown>,
): Promise<TicketDto & { pendingTransferToAgentId?: number | null }> {
  const response = await apiRequest(`/tickets/${ticketId}/transfer`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`POST transfer failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as TicketDto & { pendingTransferToAgentId?: number | null };
}

export async function approveTransfer(token: string, ticketId: number): Promise<TicketDto> {
  const response = await apiRequest(`/tickets/${ticketId}/transfer/approve`, token, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`POST transfer/approve failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as TicketDto;
}

export async function rejectTransfer(
  token: string,
  ticketId: number,
  note: string,
): Promise<TicketDto> {
  const response = await apiRequest(`/tickets/${ticketId}/transfer/reject`, token, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  if (!response.ok) {
    throw new Error(`POST transfer/reject failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as TicketDto;
}

export async function updateAgentLimit(
  managerToken: string,
  agentId: number,
  maxTicketLimit: number,
): Promise<void> {
  const response = await apiRequest(`/manager/agents/${agentId}/limit`, managerToken, {
    method: 'PUT',
    body: JSON.stringify({ maxTicketLimit }),
  });
  if (!response.ok) {
    throw new Error(`PUT agent limit failed: ${response.status} ${await response.text()}`);
  }
}

type AgentCapacityRow = {
  agentId: number;
  maxTicketLimit: number;
  activeTicketCount: number;
};

export async function getManagerCapacities(managerToken: string): Promise<AgentCapacityRow[]> {
  const response = await apiRequest('/manager/capacity', managerToken);
  if (!response.ok) {
    throw new Error(`GET manager capacity failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as AgentCapacityRow[];
}

/** Raise limit when active count would block new assignments in the same run. */
export async function ensureAgentHeadroom(
  managerToken: string,
  agentId: number,
  headroom: number,
): Promise<void> {
  const cap = (await getManagerCapacities(managerToken)).find((c) => c.agentId === agentId);
  if (!cap) return;
  const needed = cap.activeTicketCount + headroom;
  if (cap.maxTicketLimit < needed) {
    await updateAgentLimit(managerToken, agentId, needed);
  }
}

export async function assignViaAction(
  token: string,
  ticketId: number,
  assigneeId: number,
): Promise<Response> {
  return apiRequest(`/tickets/${ticketId}/actions/assign`, token, {
    method: 'POST',
    body: JSON.stringify({ assigneeId }),
  });
}

export async function addWorklog(
  token: string,
  ticketId: number,
  durationMinutes: number,
  description: string,
): Promise<Response> {
  return apiRequest(`/tickets/${ticketId}/worklogs`, token, {
    method: 'POST',
    body: JSON.stringify({ durationMinutes, description }),
  });
}

export async function deleteTicket(token: string, ticketId: number): Promise<number> {
  const response = await apiRequest(`/tickets/${ticketId}`, token, { method: 'DELETE' });
  return response.status;
}

export async function postTicketAction(
  token: string,
  ticketId: number,
  action: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  return apiRequest(`/tickets/${ticketId}/actions/${action}`, token, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function waitForProcessLinked(
  token: string,
  ticketId: number,
  timeoutMs = 30_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ticket = (await getTicket(token, ticketId)) as TicketDto & { processInstanceId?: number };
    if (ticket.processInstanceId) {
      return ticket.processInstanceId;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Ticket #${ticketId} has no processInstanceId within ${timeoutMs}ms`);
}
