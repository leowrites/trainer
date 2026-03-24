/**
 * Intelligence overview hook.
 *
 * CALLING SPEC:
 * - `useIntelligenceOverview(allSessions, goalViewModels)` derives exercise
 *   trends, routine trends, and goal progress for analytics overview surfaces.
 * - Side effects: none beyond hook reads.
 */

import { useMemo } from 'react';

import {
  buildDashboardMetrics,
  type HistorySession,
} from '@features/analytics';
import {
  buildExerciseExposureIndex,
  buildExerciseExposures,
} from '../metrics/exposures';
import {
  buildExerciseTrendSummaries,
  buildRoutineTrendSummaries,
} from '../metrics/trends';
import {
  selectHomeExerciseHighlights,
  selectHomePrimaryInsight,
} from '../selectors/home-surface';
import type {
  HomeExerciseHighlight,
  HomePrimaryInsight,
  TrainingGoalViewModel,
} from '../types';
import { useExerciseCapabilities } from './use-exercise-capabilities';

export function useIntelligenceOverview(
  allSessions: HistorySession[],
  goalViewModels: TrainingGoalViewModel[],
  options: {
    now?: number;
    capabilitiesByExerciseId?: ReturnType<
      typeof useExerciseCapabilities
    >['capabilitiesByExerciseId'];
  } = {},
): {
  exerciseTrendSummaries: ReturnType<typeof buildExerciseTrendSummaries>;
  routineTrendSummaries: ReturnType<typeof buildRoutineTrendSummaries>;
  goalViewModels: TrainingGoalViewModel[];
  homePrimaryInsight: HomePrimaryInsight;
  homeExerciseHighlights: HomeExerciseHighlight[];
} {
  const { capabilitiesByExerciseId: loadedCapabilitiesByExerciseId } =
    useExerciseCapabilities();
  const now = options.now ?? Date.now();
  const capabilitiesByExerciseId =
    options.capabilitiesByExerciseId ?? loadedCapabilitiesByExerciseId;

  return useMemo(() => {
    const exposuresByExerciseId = buildExerciseExposureIndex(
      buildExerciseExposures(allSessions, capabilitiesByExerciseId),
    );

    const exerciseTrendSummaries = buildExerciseTrendSummaries(
      exposuresByExerciseId,
      capabilitiesByExerciseId,
    ).slice(0, 4);
    const routineTrendSummaries = buildRoutineTrendSummaries(
      allSessions,
      exposuresByExerciseId,
      capabilitiesByExerciseId,
    ).slice(0, 4);

    const dashboardMetrics = buildDashboardMetrics(allSessions, { now });
    const homePrimaryInsight = selectHomePrimaryInsight({
      dashboardMetrics,
      exerciseTrendSummaries,
      routineTrendSummaries,
      goalViewModels,
      now,
    });

    return {
      exerciseTrendSummaries,
      routineTrendSummaries,
      goalViewModels,
      homePrimaryInsight,
      homeExerciseHighlights: selectHomeExerciseHighlights(
        exerciseTrendSummaries,
      ),
    };
  }, [allSessions, capabilitiesByExerciseId, goalViewModels, now]);
}
