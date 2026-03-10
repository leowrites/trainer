import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { CREATE_TABLES_SQL, DROP_TABLES_SQL, SCHEMA_VERSION } from './schema';

/**
 * Open (or create) the SQLite database and ensure all tables exist.
 *
 * On a schema version mismatch (dev workflow) we drop and recreate every
 * table so the app always starts with a consistent structure.
 * Add proper migrations here before shipping to production.
 *
 * expo-sqlite stores the file in the app's Documents directory automatically.
 * The synchronous API avoids the need for async initialisation at startup.
 */
function initDatabase(): SQLiteDatabase {
  const db = openDatabaseSync('trainer.db');

  const currentVersion = db.getFirstSync<{ user_version: number }>(
    'PRAGMA user_version',
  )?.user_version ?? 0;

  if (currentVersion !== SCHEMA_VERSION) {
    console.log(
      `[Database] Schema version mismatch (have ${currentVersion}, want ${SCHEMA_VERSION}). Dropping and recreating tables.`,
    );
    db.execSync(DROP_TABLES_SQL);
  }

  db.execSync(CREATE_TABLES_SQL);
  db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);

  return db;
}

/**
 * Singleton database instance.
 * Import via `@core/database` — never import this file directly in components.
 */
export const database: SQLiteDatabase = initDatabase();
