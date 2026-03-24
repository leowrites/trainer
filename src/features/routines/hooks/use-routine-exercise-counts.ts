/**
 * Routine exercise counts hook.
 *
 * CALLING SPEC:
 * - `useRoutineExerciseCounts()` loads exercise counts for every routine.
 * - Returns a map keyed by `routine_id` plus `refresh()`.
 * - Side effects: SQLite reads only.
 */

import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';

interface RoutineExerciseCountRow {
  routine_id: string;
  exercise_count: number;
}

export interface UseRoutineExerciseCountsResult {
  countsByRoutineId: Record<string, number>;
  refresh: () => void;
}

export function useRoutineExerciseCounts(): UseRoutineExerciseCountsResult {
  const db = useDatabase();
  const [countsByRoutineId, setCountsByRoutineId] = useState<
    Record<string, number>
  >({});
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const rows = db.getAllSync<RoutineExerciseCountRow>(
      'SELECT routine_id, COUNT(*) AS exercise_count FROM routine_exercises GROUP BY routine_id',
    );

    setCountsByRoutineId(
      rows.reduce<Record<string, number>>((accumulator, row) => {
        accumulator[row.routine_id] = row.exercise_count;
        return accumulator;
      }, {}),
    );
  }, [db, refreshKey]);

  return {
    countsByRoutineId,
    refresh,
  };
}
