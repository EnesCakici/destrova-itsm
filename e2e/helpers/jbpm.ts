const JBPM_BASE_URL =
  process.env.JBPM_URL ?? 'http://localhost:8180/kie-server/services/rest/server';
const CONTAINER_ID = 'destrova-ticket-process_1.0.0-SNAPSHOT';
const PROCESS_ID = 'destrova-ticket-process.TicketLifecycleProcess';
const JBPM_USER = process.env.JBPM_USER ?? 'kieserver';
const JBPM_PASSWORD = process.env.JBPM_PASSWORD ?? 'kieserver1!';

export interface JbpmProcessInstance {
  processInstanceId: number;
  state: number;
  correlationKey?: string;
}

export interface JbpmVariables {
  [key: string]: unknown;
}

function authHeaders(): HeadersInit {
  const token = Buffer.from(`${JBPM_USER}:${JBPM_PASSWORD}`).toString('base64');
  return {
    Authorization: `Basic ${token}`,
    Accept: 'application/json',
  };
}

function extractInstances(body: Record<string, unknown> | null): Array<Record<string, unknown>> {
  if (!body) return [];
  const instances = body['process-instance'];
  if (Array.isArray(instances)) return instances as Array<Record<string, unknown>>;
  if (instances && typeof instances === 'object') return [instances as Record<string, unknown>];
  return [];
}

function mapInstance(raw: Record<string, unknown>): JbpmProcessInstance {
  const idRaw = raw['process-instance-id'] ?? raw.id;
  const stateRaw = raw['process-instance-state'] ?? raw.state;
  return {
    processInstanceId: Number(idRaw),
    state: Number(stateRaw),
    correlationKey: raw['correlation-key'] != null ? String(raw['correlation-key']) : undefined,
  };
}

export async function findProcessByCorrelation(
  ticketId: number,
  statusFilter?: number,
): Promise<JbpmProcessInstance | null> {
  const statuses = statusFilter != null ? [statusFilter] : [1, 2, 3];
  for (const status of statuses) {
    const url = `${JBPM_BASE_URL}/queries/processes/instances/correlation/${ticketId}?status=${status}&page=0&pageSize=1`;
    const response = await fetch(url, { headers: authHeaders() });
    if (!response.ok) continue;
    const body = (await response.json()) as Record<string, unknown>;
    const instances = extractInstances(body);
    if (instances.length > 0) {
      return mapInstance(instances[0]);
    }
  }
  return null;
}

export async function waitForActiveProcess(
  ticketId: number,
  timeoutMs = 30_000,
): Promise<JbpmProcessInstance> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const proc = await findProcessByCorrelation(ticketId, 1);
    if (proc && proc.state === 1) {
      return proc;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No active jBPM process for ticketId=${ticketId} within ${timeoutMs}ms`);
}

export async function getProcessVariables(processInstanceId: number): Promise<JbpmVariables> {
  const url = `${JBPM_BASE_URL}/containers/${CONTAINER_ID}/processes/instances/${processInstanceId}/variables`;
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`GET process variables failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as JbpmVariables;
}

export async function waitForProcessVariables(
  processInstanceId: number,
  predicate: (vars: JbpmVariables) => boolean,
  timeoutMs = 30_000,
): Promise<JbpmVariables> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const vars = await getProcessVariables(processInstanceId);
    if (predicate(vars)) {
      return vars;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Process variables condition not met for instance ${processInstanceId}`);
}

export async function attemptDuplicateProcessStart(ticketId: number): Promise<number> {
  const url = `${JBPM_BASE_URL}/containers/${CONTAINER_ID}/processes/${PROCESS_ID}/instances/correlation/${ticketId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticketId,
      priority: 'MEDIUM',
      currentStatus: 'NEW',
      slaStartedAt: new Date().toISOString(),
      slaDeadline: '',
      slaPaused: false,
      totalPausedDuration: 0,
    }),
  });
  return response.status;
}

export async function waitForCompletedProcess(
  ticketId: number,
  timeoutMs = 30_000,
): Promise<JbpmProcessInstance> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const proc = await findProcessByCorrelation(ticketId);
    // 2 = completed (normal end), 3 = aborted (terminate end e.g. FORCE_CLOSED)
    if (proc && (proc.state === 2 || proc.state === 3)) {
      return proc;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Process for ticketId=${ticketId} did not complete within ${timeoutMs}ms`);
}
