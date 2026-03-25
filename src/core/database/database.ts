import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { prepareDatabase } from './migrations';

/**
 * Open (or create) the SQLite database and ensure all tables exist.
 *
 * expo-sqlite stores the file in the app's Documents directory automatically.
 */
export async function initDatabaseAsync(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync('trainer.db');
  await prepareDatabase(db);
  return db;
}

let cachedDatabasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (cachedDatabasePromise !== null) {
    return cachedDatabasePromise;
  }

  cachedDatabasePromise = initDatabaseAsync().catch((error: unknown) => {
    cachedDatabasePromise = null;
    throw error;
  });
  return cachedDatabasePromise;
}
