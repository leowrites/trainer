import type { SQLiteDatabase } from 'expo-sqlite';
import React, { createContext, useContext, useEffect } from 'react';
import { useState } from 'react';

import { getDatabase } from './database';
import { seedDevelopmentDatabase } from './seed-development';
import { seedDefaultExercises } from './seed-exercises';

const BOOTSTRAP_MAX_ATTEMPTS = 3;
const BOOTSTRAP_RETRY_DELAY_MS = 750;

// ─── React Context ────────────────────────────────────────────────────────────

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

interface DatabaseProviderProps {
  children: React.ReactNode;
  /** Override the database instance (useful for testing). */
  db?: SQLiteDatabase;
  /** Optional fallback rendered while async bootstrap is in progress. */
  fallback?: React.ReactNode;
}

/**
 * Provides the expo-sqlite `SQLiteDatabase` instance to the component tree.
 * Also seeds the default exercise catalog on first mount and, when enabled,
 * populates the development fixture dataset.
 * Wrap your root component (e.g. `<App>`) with this provider.
 */
export function DatabaseProvider({
  children,
  db,
  fallback = null,
}: DatabaseProviderProps): React.JSX.Element {
  const [resolvedDatabase, setResolvedDatabase] =
    useState<SQLiteDatabase | null>(db ?? null);
  const [isReady, setIsReady] = useState<boolean>(db !== undefined);
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let attemptCount = 0;

    if (db !== undefined) {
      setResolvedDatabase(db);
      setIsReady(true);
      setBootstrapError(null);
      return () => {
        isCancelled = true;
      };
    }

    const shouldSeedDevelopmentData =
      __DEV__ && process.env.EXPO_PUBLIC_DEV_SEED === '1';

    function normalizeError(error: unknown): Error {
      if (error instanceof Error) {
        return error;
      }

      return new Error(String(error));
    }

    async function bootstrapDatabase(): Promise<void> {
      try {
        attemptCount += 1;
        const targetDb = await getDatabase();

        if (isCancelled) {
          return;
        }

        try {
          if (shouldSeedDevelopmentData) {
            await seedDevelopmentDatabase(targetDb);
          } else {
            await seedDefaultExercises(targetDb);
          }
        } catch (error) {
          console.error(
            shouldSeedDevelopmentData
              ? '[Seed] Failed to seed development data:'
              : '[Seed] Failed to seed default exercises:',
            error,
          );
        }

        if (!isCancelled) {
          setResolvedDatabase(targetDb);
          setIsReady(true);
          setBootstrapError(null);
        }
      } catch (error) {
        const normalizedError = normalizeError(error);
        console.error(
          `[Database] Failed to initialize (attempt ${attemptCount}/${BOOTSTRAP_MAX_ATTEMPTS}):`,
          normalizedError,
        );

        if (isCancelled) {
          return;
        }

        if (attemptCount >= BOOTSTRAP_MAX_ATTEMPTS) {
          setBootstrapError(normalizedError);
          return;
        }

        retryTimeout = setTimeout(() => {
          retryTimeout = null;
          void bootstrapDatabase();
        }, BOOTSTRAP_RETRY_DELAY_MS);
      }
    }

    setIsReady(false);
    setResolvedDatabase(null);
    setBootstrapError(null);
    void bootstrapDatabase();

    return () => {
      isCancelled = true;
      if (retryTimeout !== null) {
        clearTimeout(retryTimeout);
      }
    };
  }, [db]);

  if (bootstrapError) {
    throw bootstrapError;
  }

  if (!isReady || resolvedDatabase === null) {
    return <>{fallback}</>;
  }

  return (
    <DatabaseContext.Provider value={resolvedDatabase}>
      {children}
    </DatabaseContext.Provider>
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

export function useOptionalDatabase(): SQLiteDatabase | null {
  return useContext(DatabaseContext);
}
