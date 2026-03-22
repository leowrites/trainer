/**
 * Intelligence overview hook.
 *
 * CALLING SPEC:
 * - `useIntelligenceOverview(allSessions, goalViewModels)` derives exercise
 *   trends, routine trends, and goal progress for analytics overview surfaces.
 * - Side effects: none beyond hook reads.
 */

import { useMemo } from 'react';

import type { HistorySession } from '@features/analytics';
import { useOptionalDatabase } from '@core/database/provider';
import { loadExerciseCapabilities } from '../metrics/capabilities';
import {
  buildExerciseExposureIndex,
  buildExerciseExposures,
} from '../metrics/exposures';
import {
  buildExerciseTrendSummaries,
  buildRoutineTrendSummaries,
} from '../metrics/trends';
import type { TrainingGoalViewModel } from '../types';

export function useIntelligenceOverview(
  allSessions: HistorySession[],
  goalViewModels: TrainingGoalViewModel[],
): {
  exerciseTrendSummaries: ReturnType<typeof buildExerciseTrendSummaries>;
  routineTrendSummaries: ReturnType<typeof buildRoutineTrendSummaries>;
  goalViewModels: TrainingGoalViewModel[];
} {
  const db = useOptionalDatabase();

  return useMemo(() => {
    const capabilitiesByExerciseId =
      !db || typeof db.getAllSync !== 'function'
        ? {}
        : loadExerciseCapabilities(db);
    const exposuresByExerciseId = buildExerciseExposureIndex(
      buildExerciseExposures(allSessions, capabilitiesByExerciseId),
    );

    return {
      exerciseTrendSummaries: buildExerciseTrendSummaries(
        exposuresByExerciseId,
        capabilitiesByExerciseId,
      ).slice(0, 4),
      routineTrendSummaries: buildRoutineTrendSummaries(
        allSessions,
        exposuresByExerciseId,
        capabilitiesByExerciseId,
      ).slice(0, 4),
      goalViewModels,
    };
  }, [allSessions, db, goalViewModels]);
}
