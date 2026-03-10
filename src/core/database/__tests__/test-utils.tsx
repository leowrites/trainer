/**
 * Shared test utilities for database-dependent hooks.
 *
 * Creates a minimal in-memory mock of the expo-sqlite synchronous API so that
 * hooks can be exercised without a native SQLite runtime.
 */
import React from 'react';

import { DatabaseProvider } from '@core/database/provider';

// ─── Types ────────────────────────────────────────────────────────────────────

// Minimal interface matching only the methods our hooks use.
export interface MockDb {
  getAllSync: jest.Mock;
  getFirstSync: jest.Mock;
  runSync: jest.Mock;
  execSync: jest.Mock;
  withTransactionSync: jest.Mock;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a jest-mocked database.
 *
 * `withTransactionSync` immediately invokes its callback so hook logic inside
 * transactions is exercised normally.
 */
export function createMockDb(): MockDb {
  return {
    getAllSync: jest.fn().mockReturnValue([]),
    getFirstSync: jest.fn().mockReturnValue(null),
    runSync: jest.fn(),
    execSync: jest.fn(),
    withTransactionSync: jest.fn().mockImplementation((fn: () => void) => fn()),
  };
}

// ─── Test wrapper ─────────────────────────────────────────────────────────────

/**
 * Returns a React wrapper that injects the mock DB into the DatabaseProvider
 * so hooks that call `useDatabase()` receive the mock instead of the native DB.
 */
export function createDatabaseWrapper(db: MockDb): React.FC<{
  children: React.ReactNode;
}> {
  return function TestWrapper({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <DatabaseProvider db={db as any}>{children}</DatabaseProvider>
    );
  };
}
