import { v4 as uuidv4 } from 'uuid';
import { HealthLog } from '../types';
import { getDatabase } from './database';

interface HealthLogRow {
  id: string;
  date: string;
  type: 'bodyweight' | 'steps' | 'activity';
  value: number;
  unit: string;
  notes: string;
  loggedAt: number;
}

function rowToHealthLog(row: HealthLogRow): HealthLog {
  return { ...row };
}

export async function logHealthData(
  data: Omit<HealthLog, 'id' | 'loggedAt'>
): Promise<HealthLog> {
  const db = getDatabase();
  const id = uuidv4();
  const loggedAt = Date.now();
  await db.runAsync(
    'INSERT INTO health_logs (id, date, type, value, unit, notes, loggedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.date, data.type, data.value, data.unit, data.notes, loggedAt]
  );
  return { id, loggedAt, ...data };
}

export async function getHealthLogs(
  type?: HealthLog['type'],
  startDate?: string,
  endDate?: string
): Promise<HealthLog[]> {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (type) { conditions.push('type = ?'); params.push(type); }
  if (startDate) { conditions.push('date >= ?'); params.push(startDate); }
  if (endDate) { conditions.push('date <= ?'); params.push(endDate); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await db.getAllAsync<HealthLogRow>(
    `SELECT * FROM health_logs ${where} ORDER BY date DESC, loggedAt DESC`,
    params
  );
  return rows.map(rowToHealthLog);
}

export async function getLatestHealthLog(type: HealthLog['type']): Promise<HealthLog | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<HealthLogRow>(
    'SELECT * FROM health_logs WHERE type = ? ORDER BY date DESC, loggedAt DESC LIMIT 1',
    [type]
  );
  return row ? rowToHealthLog(row) : null;
}

export async function deleteHealthLog(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM health_logs WHERE id = ?', [id]);
}
