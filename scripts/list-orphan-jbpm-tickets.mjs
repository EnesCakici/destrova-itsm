/**
 * Lists tickets without a linked jBPM process instance (process_instance_id IS NULL).
 * Usage: node scripts/list-orphan-jbpm-tickets.mjs
 */
import { execSync } from 'child_process';

const PG_CONTAINER = process.env.PG_CONTAINER ?? 'ticket_postgres';

function psql(query) {
  const escaped = query.replace(/"/g, '\\"');
  const out = execSync(
    `docker exec ${PG_CONTAINER} psql -U ticket_user -d ticket_db -t -A -c "${escaped}"`,
    { encoding: 'utf8' },
  );
  return out.trim();
}

const count = psql(
  'SELECT COUNT(*) FROM tickets WHERE process_instance_id IS NULL;',
);
console.log(`Orphan tickets (no process_instance_id): ${count}`);

if (Number(count) === 0) {
  process.exit(0);
}

const rows = psql(
  'SELECT id, status, created_at FROM tickets WHERE process_instance_id IS NULL ORDER BY id DESC LIMIT 50;',
);
console.log('\nLatest orphans (max 50):');
console.log('id\tstatus\tcreated_at');
for (const line of rows.split('\n').filter(Boolean)) {
  console.log(line.replace(/\|/g, '\t'));
}

console.log('\nThese tickets were created while jBPM deployment was missing.');
console.log('Fix: ensure container STARTED, then create new tickets or manually link processes in BC.');
