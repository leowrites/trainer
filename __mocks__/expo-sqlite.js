/**
 * Manual Jest mock for expo-sqlite.
 *
 * Provides a minimal synchronous API stub so that modules importing
 * expo-sqlite (e.g. database.ts, provider.tsx) can be resolved during tests
 * without requiring native SQLite binaries.
 *
 * Individual tests inject a mock database instance via DatabaseProvider's
 * `db` prop rather than using the singleton returned here.
 */

const mockDb = {
  getAllSync: jest.fn().mockReturnValue([]),
  getFirstSync: jest.fn().mockReturnValue(null),
  runSync: jest.fn(),
  execSync: jest.fn(),
  withTransactionSync: jest.fn().mockImplementation((fn) => fn()),
};

module.exports = {
  openDatabaseSync: jest.fn().mockReturnValue(mockDb),
  // Re-export as named export for TypeScript `import type { SQLiteDatabase }`
  SQLiteDatabase: class {},
};
