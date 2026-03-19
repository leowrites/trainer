import { useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { loadPreviousExercisePerformanceMap } from '../session-repository';
import type { PreviousExercisePerformance } from '../types';

export function usePreviousExercisePerformance(
  currentSessionId: string | null,
  exerciseIds: string[],
): Record<string, PreviousExercisePerformance | null> {
  const db = useDatabase();
  const exerciseKey = exerciseIds.join('|');
  const [performanceByExerciseId, setPerformanceByExerciseId] = useState<
    Record<string, PreviousExercisePerformance | null>
  >({});

  useEffect(() => {
    const requestedExerciseIds =
      exerciseKey === '' ? [] : exerciseKey.split('|');

    if (!currentSessionId || requestedExerciseIds.length === 0) {
      setPerformanceByExerciseId({});
      return;
    }

    setPerformanceByExerciseId(
      loadPreviousExercisePerformanceMap(
        db,
        currentSessionId,
        requestedExerciseIds,
      ),
    );
  }, [currentSessionId, db, exerciseKey]);

  return performanceByExerciseId;
}
