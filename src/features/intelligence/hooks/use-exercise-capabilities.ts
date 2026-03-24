/**
 * Exercise capabilities hook.
 *
 * CALLING SPEC:
 * - `useExerciseCapabilities()` loads the exercise capability map once from
 *   SQLite and keeps it outside caller render paths.
 * - Returns a stable `capabilitiesByExerciseId` object plus `refresh()`.
 * - Side effects: SQLite reads only.
 */

import { useCallback, useEffect, useState } from 'react';

import { useOptionalDatabase } from '@core/database/provider';
import { loadExerciseCapabilities } from '../metrics/capabilities';
import type { ExerciseCapability } from '../types';

export interface UseExerciseCapabilitiesResult {
  capabilitiesByExerciseId: Record<string, ExerciseCapability>;
  refresh: () => void;
}

export function useExerciseCapabilities(): UseExerciseCapabilitiesResult {
  const db = useOptionalDatabase();
  const [capabilitiesByExerciseId, setCapabilitiesByExerciseId] = useState<
    Record<string, ExerciseCapability>
  >({});
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!db || typeof db.getAllSync !== 'function') {
      setCapabilitiesByExerciseId({});
      return;
    }

    setCapabilitiesByExerciseId(loadExerciseCapabilities(db));
  }, [db, refreshKey]);

  return {
    capabilitiesByExerciseId,
    refresh,
  };
}
