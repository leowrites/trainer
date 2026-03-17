import type { SQLiteDatabase } from 'expo-sqlite';

import { prepareDatabase } from '../migrations';
import { SCHEMA_VERSION } from '../schema';

interface MockDatabase extends Partial<SQLiteDatabase> {
  execSync: jest.Mock;
  getAllSync: jest.Mock;
  getFirstSync: jest.Mock;
  withTransactionSync: jest.Mock;
}

function createMigrationDbMock({
  version = 0,
  tableNames = ['workout_sessions'],
  hasScheduleIdColumn = true,
}: {
  version?: number;
  tableNames?: string[];
  hasScheduleIdColumn?: boolean;
} = {}): MockDatabase {
  let userVersion = version;

  const db: MockDatabase = {
    execSync: jest.fn((sql: string) => {
      const match = sql.match(/PRAGMA user_version = (\d+)/);
      if (match) {
        userVersion = Number(match[1]);
      }
    }),
    getAllSync: jest.fn((sql: string) => {
      if (sql === 'PRAGMA table_info(workout_sessions)') {
        return hasScheduleIdColumn ? [{ name: 'schedule_id' }] : [];
      }

      return [];
    }),
    getFirstSync: jest.fn((sql: string, params?: unknown[]) => {
      if (sql === 'PRAGMA user_version') {
        return { user_version: userVersion };
      }

      if (sql.includes('sqlite_master')) {
        const tableName = String(params?.[0] ?? '');
        return tableNames.includes(tableName) ? { name: tableName } : null;
      }

      return null;
    }),
    withTransactionSync: jest.fn((fn: () => void) => fn()),
  };

  return db;
}

describe('prepareDatabase', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('creates the latest schema for a fresh install and sets the current version', () => {
    const db = createMigrationDbMock({
      version: 0,
      tableNames: [],
    });

    const finalVersion = prepareDatabase(db as SQLiteDatabase);

    expect(finalVersion).toBe(SCHEMA_VERSION);
    expect(db.execSync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS body_weight_entries'),
    );
    expect(db.execSync).toHaveBeenCalledWith(
      `PRAGMA user_version = ${SCHEMA_VERSION}`,
    );
    expect(db.withTransactionSync).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('migrates a version 2 database forward without destructive resets', () => {
    const db = createMigrationDbMock({ version: 2 });

    const finalVersion = prepareDatabase(db as SQLiteDatabase);

    expect(finalVersion).toBe(SCHEMA_VERSION);
    expect(db.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining('DROP TABLE'),
    );
    expect(db.execSync).toHaveBeenCalledWith(
      `PRAGMA user_version = ${SCHEMA_VERSION}`,
    );
    expect(db.execSync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS body_weight_entries'),
    );
  });

  it('patches legacy unversioned workout sessions before running newer migrations', () => {
    const db = createMigrationDbMock({
      version: 0,
      tableNames: ['workout_sessions'],
      hasScheduleIdColumn: false,
    });

    const finalVersion = prepareDatabase(db as SQLiteDatabase);

    expect(finalVersion).toBe(SCHEMA_VERSION);
    expect(db.execSync).toHaveBeenCalledWith(
      'ALTER TABLE workout_sessions ADD COLUMN schedule_id TEXT;',
    );
    expect(db.execSync).toHaveBeenCalledWith(
      'ALTER TABLE workout_sessions ADD COLUMN snapshot_name TEXT;',
    );
    expect(db.withTransactionSync).toHaveBeenCalled();
  });

  it('returns early on a newer schema version without applying DDL', () => {
    const db = createMigrationDbMock({
      version: SCHEMA_VERSION + 1,
      tableNames: ['workout_sessions', 'workout_sets'],
    });

    const finalVersion = prepareDatabase(db as SQLiteDatabase);

    expect(finalVersion).toBe(SCHEMA_VERSION + 1);
    expect(db.execSync).not.toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS'),
    );
  });
});
