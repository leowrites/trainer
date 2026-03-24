/**
 * Previous exercise performance cache.
 *
 * CALLING SPEC:
 * - cache previous-performance lookups by session id and exercise id
 * - fetch only missing exercise entries when the active workout grows
 * - keep the returned map stable while the exercise list is unchanged
 * - side effects: sqlite reads
 */

import { useEffect, useRef, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { loadPreviousExercisePerformanceMap } from '../session-repository';
import type { PreviousExercisePerformance } from '../types';

export function usePreviousExercisePerformance(
  currentSessionId: string | null,
  exerciseIds: string[],
): Record<string, PreviousExercisePerformance | null> {
  const db = useDatabase();
  const [performanceByExerciseId, setPerformanceByExerciseId] = useState<
    Record<string, PreviousExercisePerformance | null>
  >({});
  const cacheRef = useRef<Record<string, PreviousExercisePerformance | null>>(
    {},
  );
  const exerciseKey = exerciseIds.join('|');

  useEffect(() => {
    if (!currentSessionId || exerciseIds.length === 0) {
      setPerformanceByExerciseId({});
      return;
    }

    const requestedExerciseIds = exerciseIds.filter(Boolean);
    const missingExerciseIds = requestedExerciseIds.filter(
      (exerciseId) =>
        cacheRef.current[`${currentSessionId}:${exerciseId}`] === undefined,
    );

    if (missingExerciseIds.length > 0) {
      const loadedPerformance = loadPreviousExercisePerformanceMap(
        db,
        currentSessionId,
        missingExerciseIds,
      );

      missingExerciseIds.forEach((exerciseId) => {
        cacheRef.current[`${currentSessionId}:${exerciseId}`] =
          loadedPerformance[exerciseId] ?? null;
      });
    }

    const nextPerformanceByExerciseId = Object.fromEntries(
      requestedExerciseIds.map((exerciseId) => [
        exerciseId,
        cacheRef.current[`${currentSessionId}:${exerciseId}`] ?? null,
      ]),
    );

    setPerformanceByExerciseId((currentPerformanceByExerciseId) => {
      const currentKeys = Object.keys(currentPerformanceByExerciseId);

      if (
        currentKeys.length === requestedExerciseIds.length &&
        requestedExerciseIds.every(
          (exerciseId) =>
            currentPerformanceByExerciseId[exerciseId] ===
            nextPerformanceByExerciseId[exerciseId],
        )
      ) {
        return currentPerformanceByExerciseId;
      }

      return nextPerformanceByExerciseId;
    });
  }, [currentSessionId, db, exerciseIds, exerciseKey]);

  return performanceByExerciseId;
}
