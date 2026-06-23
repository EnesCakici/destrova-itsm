import { execSync } from 'child_process';

const PG_CONTAINER = process.env.PG_CONTAINER ?? 'ticket_postgres';
const PG_USER = process.env.PG_USER ?? 'ticket_user';
const PG_DB = process.env.PG_DB ?? 'ticket_db';

export function execSql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"');
  return execSync(
    `docker exec ${PG_CONTAINER} psql -U ${PG_USER} -d ${PG_DB} -t -A -c "${escaped}"`,
    { encoding: 'utf8' },
  ).trim();
}

export function nullTicketSlaDueDate(ticketId: number): void {
  execSql(`UPDATE tickets SET sla_due_date = NULL WHERE id = ${ticketId}`);
}

/** Pin ticket into an isolated report window for deterministic SLA metrics. */
export function setTicketClosedForReports(
  ticketId: number,
  options: { compliant: boolean; windowDate?: string },
): void {
  const day = options.windowDate ?? '2030-06-15';
  const closedAt = options.compliant ? `${day} 11:00:00` : `${day} 13:00:00`;
  execSql(
    `UPDATE tickets SET created_at = '${day} 10:00:00', closed_at = '${closedAt}', status = 'CLOSED', sla_due_date = '${day} 12:00:00' WHERE id = ${ticketId}`,
  );
}

export function countWebhookEventsForId(eventId: string): number {
  const safe = eventId.replace(/'/g, "''");
  const raw = execSql(`SELECT COUNT(*) FROM webhook_processed_events WHERE event_id = '${safe}'`);
  return Number(raw) || 0;
}

export function webhookEventExists(eventId: string): boolean {
  return countWebhookEventsForId(eventId) > 0;
}
