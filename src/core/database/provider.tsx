import type { SQLiteDatabase } from 'expo-sqlite';
import React, { createContext, useContext, useEffect } from 'react';

import { database } from './database';
import { seedDevelopmentDatabase } from './seed-development';
import { seedDefaultExercises } from './seed-exercises';

// ─── React Context ────────────────────────────────────────────────────────────

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

interface DatabaseProviderProps {
  children: React.ReactNode;
  /** Override the database instance (useful for testing). */
  db?: SQLiteDatabase;
}

/**
 * Provides the expo-sqlite `SQLiteDatabase` instance to the component tree.
 * Also seeds the default exercise catalog on first mount and, when enabled,
 * populates the development fixture dataset.
 * Wrap your root component (e.g. `<App>`) with this provider.
 */
export function DatabaseProvider({
  children,
  db = database,
}: DatabaseProviderProps): React.JSX.Element {
  useEffect(() => {
    try {
      seedDefaultExercises(db);
      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_SEED === '1') {
        seedDevelopmentDatabase(db);
      }
    } catch (error) {
      console.error('[Seed] Failed to seed development data:', error);
    }
  }, [db]);

  return (
    <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
  );
}

/**
 * Returns the expo-sqlite `SQLiteDatabase` instance from context.
 * Must be called inside a component wrapped by `<DatabaseProvider>`.
 */
export function useDatabase(): SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase must be used within a <DatabaseProvider>');
  }
  return db;
}
