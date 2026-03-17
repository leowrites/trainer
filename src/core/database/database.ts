import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { prepareDatabase } from './migrations';

/**
 * Open (or create) the SQLite database and ensure all tables exist.
 *
 * expo-sqlite stores the file in the app's Documents directory automatically.
 * The synchronous API avoids the need for async initialisation at startup.
 */
export function initDatabase(): SQLiteDatabase {
  const db = openDatabaseSync('trainer.db');
  prepareDatabase(db);
  return db;
}

/**
 * Singleton database instance.
 * Import via `@core/database` — never import this file directly in components.
 */
export const database: SQLiteDatabase = initDatabase();
