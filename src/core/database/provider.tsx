import type { Database } from '@nozbe/watermelondb';
import React, { createContext, useContext, useEffect } from 'react';

import { database } from './database';
import { seedDefaultExercises } from './seed-exercises';

// ─── React Context ────────────────────────────────────────────────────────────

const DatabaseContext = createContext<Database | null>(null);

interface DatabaseProviderProps {
  children: React.ReactNode;
  /** Override the database instance (useful for testing). */
  db?: Database;
}

/**
 * Provides the WatermelonDB `Database` instance to the component tree.
 * Also runs the one-time exercise seed on first mount.
 * Wrap your root component (e.g. `<App>`) with this provider.
 */
export function DatabaseProvider({
  children,
  db = database,
}: DatabaseProviderProps): React.JSX.Element {
  useEffect(() => {
    seedDefaultExercises(db).catch((error) => {
      console.error('[Seed] Failed to seed default exercises:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
