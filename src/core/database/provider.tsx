import type { Database } from '@nozbe/watermelondb';
import React, { createContext, useContext } from 'react';

import { database } from './database';

// ─── React Context ────────────────────────────────────────────────────────────

const DatabaseContext = createContext<Database | null>(null);

interface DatabaseProviderProps {
  children: React.ReactNode;
  /** Override the database instance (useful for testing). */
  db?: Database;
}

/**
 * Provides the WatermelonDB `Database` instance to the component tree.
 * Wrap your root component (e.g. `<App>`) with this provider.
 */
export function DatabaseProvider({
  children,
  db = database,
}: DatabaseProviderProps): React.JSX.Element {
  return (
    <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
  );
}

/**
 * Returns the WatermelonDB `Database` instance from context.
 * Must be called inside a component wrapped by `<DatabaseProvider>`.
 */
export function useDatabase(): Database {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase must be used within a <DatabaseProvider>');
  }
  return db;
}
