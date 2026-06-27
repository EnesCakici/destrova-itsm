import {
  apiRequest,
  closeTicketForCleanup,
  getManagerCapacities,
  getMe,
  getToken,
  updateAgentLimit,
  type TicketStatus,
} from './api';

/** Default agent inbox capacity for E2E accounts (matches typical seed data). */
export const DEFAULT_E2E_AGENT_LIMIT = 27;

const ACTIVE_STATUSES: TicketStatus[] = ['NEW', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED'];

/** E2E agent accounts whose open tickets block assign/transfer tests. */
export function getE2eAgentCredentials(): Array<{ email: string; password: string }> {
  const rows: Array<[string | undefined, string | undefined]> = [
    [process.env.AGENT_EMAIL, process.env.AGENT_PASSWORD],
    [process.env.AGENT2_EMAIL ?? 'agent2@ticket.com', process.env.AGENT2_PASSWORD ?? '123456'],
    [process.env.AGENT3_EMAIL ?? 'agent3@ticket.com', process.env.AGENT3_PASSWORD ?? '123456'],
  ];
  return rows
    .filter((row): row is [string, string] => Boolean(row[0] && row[1]))
    .map(([email, password]) => ({ email, password }));
}

/**
 * Closes active tickets on E2E agent inboxes via manager force-close (INVALID).
 * Matches product model: tickets are closed, not deleted.
 */
export async function releaseE2eAgentCapacity(managerToken: string): Promise<number> {
  let closed = 0;

  for (const { email, password } of getE2eAgentCredentials()) {
    const agentToken = await getToken(email, password);
    const { id: agentId } = await getMe(agentToken);

    for (const status of ACTIVE_STATUSES) {
      const response = await apiRequest(
        `/manager/tickets?assigneeId=${agentId}&status=${status}`,
        managerToken,
      );
      if (!response.ok) {
        console.warn(
          `[E2E setup] GET manager/tickets assignee=${agentId} status=${status} → HTTP ${response.status}`,
        );
        continue;
      }

      const tickets = (await response.json()) as Array<{ id: number; status?: string }>;
      for (const ticket of tickets) {
        const before = ticket.status;
        await closeTicketForCleanup(managerToken, ticket.id);
        if (before !== 'CLOSED') {
          closed += 1;
        }
      }
    }
  }

  const caps = await getManagerCapacities(managerToken);
  for (const { email, password } of getE2eAgentCredentials()) {
    const agentToken = await getToken(email, password);
    const { id } = await getMe(agentToken);
    const cap = caps.find((c) => c.agentId === id);
    if (cap && cap.activeTicketCount > 0) {
      console.warn(`[E2E setup] ${email} still has ${cap.activeTicketCount} active tickets after cleanup`);
    }
  }

  return closed;
}

/** Reset test agent limits after prior runs (e.g. MGR-010 / TRNSFR-005 capacity tests). */
export async function restoreE2eAgentLimits(managerToken: string): Promise<void> {
  const caps = await getManagerCapacities(managerToken);

  for (const { email, password } of getE2eAgentCredentials()) {
    const agentToken = await getToken(email, password);
    const { id } = await getMe(agentToken);
    const cap = caps.find((c) => c.agentId === id);
    const needed = Math.max(
      DEFAULT_E2E_AGENT_LIMIT,
      (cap?.activeTicketCount ?? 0) + 5,
    );
    if (!cap || cap.maxTicketLimit < needed) {
      await updateAgentLimit(managerToken, id, needed);
    }
  }
}
