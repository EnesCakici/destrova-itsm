import dotenv from 'dotenv';
import path from 'path';
import { getToken } from './helpers/api';
import { releaseE2eAgentCapacity } from './helpers/cleanup';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

export default async function globalSetup() {
  if (process.env.SKIP_E2E_SETUP === '1') {
    return;
  }

  const managerEmail = process.env.MANAGER_EMAIL;
  const managerPassword = process.env.MANAGER_PASSWORD;
  if (!managerEmail || !managerPassword) {
    console.warn('[E2E setup] MANAGER_* missing — skipping agent capacity release');
    return;
  }

  try {
    const managerToken = await getToken(managerEmail, managerPassword);
    const closed = await releaseE2eAgentCapacity(managerToken);
    if (closed > 0) {
      console.log(`[E2E setup] Force-closed ${closed} active E2E agent ticket(s) for headroom`);
    }
  } catch (error) {
    console.warn(`[E2E setup] Agent capacity release failed (non-blocking): ${error}`);
  }
}
