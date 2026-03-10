import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { CREATE_TABLES_SQL } from './schema';

/**
 * Open (or create) the SQLite database and ensure all tables exist.
 *
 * expo-sqlite stores the file in the app's Documents directory automatically.
 * The synchronous API avoids the need for async initialisation at startup.
 */
function initDatabase(): SQLiteDatabase {
  const db = openDatabaseSync('trainer.db');
  db.execSync(CREATE_TABLES_SQL);
  return db;
}

/**
 * Singleton database instance.
 * Import via `@core/database` — never import this file directly in components.
 */
export const database: SQLiteDatabase = initDatabase();
