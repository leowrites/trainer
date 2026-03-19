import { useMemo } from 'react';

import { useDatabase } from '@core/database/provider';
import { loadPreviousExercisePerformanceMap } from '../session-repository';
import type { PreviousExercisePerformance } from '../types';

export function usePreviousExercisePerformance(
  currentSessionId: string | null,
  exerciseIds: string[],
): Record<string, PreviousExercisePerformance | null> {
  const db = useDatabase();
  const exerciseKey = exerciseIds.join('|');

  return useMemo(() => {
    const requestedExerciseIds =
      exerciseKey === '' ? [] : exerciseKey.split('|');

    if (!currentSessionId || requestedExerciseIds.length === 0) {
      return {};
    }

    return loadPreviousExercisePerformanceMap(
      db,
      currentSessionId,
      requestedExerciseIds,
    );
  }, [currentSessionId, db, exerciseKey]);
}
