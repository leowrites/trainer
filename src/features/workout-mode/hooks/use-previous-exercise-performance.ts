/**
 * Previous exercise performance cache.
 *
 * CALLING SPEC:
 * - cache previous-performance lookups by session id and exercise id
 * - fetch only missing exercise entries when the active workout grows
 * - keep the returned map stable while the exercise list is unchanged
 * - side effects: sqlite reads
 */

import { useEffect, useMemo, useRef, useState } from 'react';

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
  const requestIdRef = useRef(0);
  const exerciseKey = exerciseIds.filter(Boolean).join('|');
  const requestedExerciseIds = useMemo(
    () => (exerciseKey.length === 0 ? [] : exerciseKey.split('|')),
    [exerciseKey],
  );

  useEffect(() => {
    let isCancelled = false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    async function hydratePreviousPerformance(): Promise<void> {
      if (!currentSessionId || requestedExerciseIds.length === 0) {
        if (!isCancelled && requestId === requestIdRef.current) {
          setPerformanceByExerciseId({});
        }
        return;
      }

      const missingExerciseIds = requestedExerciseIds.filter(
        (exerciseId) =>
          cacheRef.current[`${currentSessionId}:${exerciseId}`] === undefined,
      );

      if (missingExerciseIds.length > 0) {
        const loadedPerformance = await loadPreviousExercisePerformanceMap(
          db,
          currentSessionId,
          missingExerciseIds,
        );

        if (isCancelled || requestId !== requestIdRef.current) {
          return;
        }

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

      if (isCancelled || requestId !== requestIdRef.current) {
        return;
      }

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
    }

    void hydratePreviousPerformance();

    return () => {
      isCancelled = true;
    };
  }, [currentSessionId, db, requestedExerciseIds]);

  return performanceByExerciseId;
}
