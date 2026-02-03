import { promises as fs } from 'fs';
import * as path from 'path';
import { RequestRecord, OracleState } from '../types';

const RECORDS_DIR = './records';
const STATE_FILE = path.join(RECORDS_DIR, 'oracle-state.json');
const REQUESTS_FILE = path.join(RECORDS_DIR, 'requests.jsonl');

async function ensureRecordsDir(): Promise<void> {
  try {
    await fs.mkdir(RECORDS_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

export async function loadOracleState(): Promise<OracleState> {
  await ensureRecordsDir();
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data) as OracleState;
  } catch {
    const initialState: OracleState = {
      totalRequests: 0,
      totalResolved: 0,
      cumulativeBrier: 0,
      averageBrier: 0,
      lastUpdated: new Date().toISOString(),
    };
    await saveOracleState(initialState);
    return initialState;
  }
}

export async function saveOracleState(state: OracleState): Promise<void> {
  await ensureRecordsDir();
  state.lastUpdated = new Date().toISOString();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export async function appendRequest(record: RequestRecord): Promise<void> {
  await ensureRecordsDir();
  const line = JSON.stringify(record) + '\n';
  await fs.appendFile(REQUESTS_FILE, line, 'utf-8');

  const state = await loadOracleState();
  state.totalRequests++;
  await saveOracleState(state);
}

export async function getRequest(requestId: string): Promise<RequestRecord | null> {
  const requests = await getAllRequests();
  return requests.find((r) => r.requestId === requestId) ?? null;
}

export async function getAllRequests(): Promise<RequestRecord[]> {
  await ensureRecordsDir();
  try {
    const data = await fs.readFile(REQUESTS_FILE, 'utf-8');
    const lines = data.trim().split('\n').filter((line) => line.length > 0);
    return lines.map((line) => JSON.parse(line) as RequestRecord);
  } catch {
    return [];
  }
}

export async function updateRequest(
  requestId: string,
  updates: Partial<RequestRecord>
): Promise<void> {
  const requests = await getAllRequests();
  const index = requests.findIndex((r) => r.requestId === requestId);

  if (index === -1) {
    throw new Error(`Request not found: ${requestId}`);
  }

  requests[index] = { ...requests[index], ...updates };

  const lines = requests.map((r) => JSON.stringify(r)).join('\n') + '\n';
  await fs.writeFile(REQUESTS_FILE, lines, 'utf-8');

  if (updates.actualOutcome !== undefined && updates.brierContribution !== undefined) {
    const state = await loadOracleState();
    state.totalResolved++;
    state.cumulativeBrier += updates.brierContribution;
    state.averageBrier = state.cumulativeBrier / state.totalResolved;
    await saveOracleState(state);
  }
}
