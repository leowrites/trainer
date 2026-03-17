import type { SQLiteDatabase } from 'expo-sqlite';

import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';

interface UserVersionRow {
  user_version: number;
}

interface SqliteMasterRow {
  name: string;
}

interface TableInfoRow {
  name: string;
}

interface Migration {
  version: number;
  description: string;
  up: (db: SQLiteDatabase) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Adopt explicit schema versioning for existing installs.',
    up: () => {
      // Version 1 matched the bootstrap-created base schema.
    },
  },
  {
    version: 2,
    description: 'Advance the schema version without changing table layout.',
    up: () => {
      // Version 2 only introduced the user_version pragma.
    },
  },
  {
    version: 3,
    description: 'Add persisted body-weight entries for offline tracking.',
    up: (db) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS body_weight_entries (
          id        TEXT PRIMARY KEY NOT NULL,
          weight    REAL NOT NULL,
          unit      TEXT NOT NULL DEFAULT 'kg',
          logged_at INTEGER NOT NULL,
          notes     TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_body_weight_entries_logged_at
          ON body_weight_entries (logged_at);
      `);
    },
  },
];

function setUserVersion(db: SQLiteDatabase, version: number): void {
  db.execSync(`PRAGMA user_version = ${version}`);
}

function tableExists(db: SQLiteDatabase, tableName: string): boolean {
  const row = db.getFirstSync<SqliteMasterRow>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName],
  );
  return row?.name === tableName;
}

function columnExists(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
): boolean {
  const columns = db.getAllSync<TableInfoRow>(
    `PRAGMA table_info(${tableName})`,
  );
  return columns.some((column) => column.name === columnName);
}

export function getUserVersion(db: SQLiteDatabase): number {
  return (
    db.getFirstSync<UserVersionRow>('PRAGMA user_version')?.user_version ?? 0
  );
}

export function prepareDatabase(db: SQLiteDatabase): number {
  db.execSync(CREATE_TABLES_SQL);

  const currentVersion = getUserVersion(db);

  if (currentVersion > SCHEMA_VERSION) {
    console.warn(
      `[Database] Schema version ${currentVersion} is newer than supported version ${SCHEMA_VERSION}. Skipping migrations.`,
    );
    return currentVersion;
  }

  if (
    currentVersion === 0 &&
    tableExists(db, 'workout_sessions') &&
    !columnExists(db, 'workout_sessions', 'schedule_id')
  ) {
    db.withTransactionSync(() => {
      db.execSync('ALTER TABLE workout_sessions ADD COLUMN schedule_id TEXT;');
      db.execSync(
        'ALTER TABLE workout_sessions ADD COLUMN snapshot_name TEXT;',
      );
      setUserVersion(db, 2);
    });
  }

  let migratedVersion = getUserVersion(db);

  for (const migration of migrations) {
    if (migration.version <= migratedVersion) {
      continue;
    }

    console.warn(
      `[Database] Migrating schema from version ${migratedVersion} to ${migration.version}: ${migration.description}`,
    );

    db.withTransactionSync(() => {
      migration.up(db);
      setUserVersion(db, migration.version);
    });

    migratedVersion = migration.version;
  }

  return migratedVersion;
}
