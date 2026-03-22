/**
 * Exposure metrics.
 *
 * CALLING SPEC:
 * - `buildExerciseExposures(sessions, capabilities)` derives one exposure per
 *   exercise per session from analytics history.
 * - `buildExerciseExposureIndex(exposures)` groups exposures by exercise id in
 *   reverse-chronological order.
 * - Side effects: none.
 */

import type {
  HistoryExerciseSummary,
  HistorySession,
} from '@features/analytics';
import type { ExerciseCapability, ExerciseExposure } from '../types';
import { estimateOneRepMax } from './e1rm';

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateCoefficientOfVariation(values: number[]): number | null {
  const average = calculateAverage(values);

  if (average === null || average <= 0 || values.length < 2) {
    return null;
  }

  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance) / average;
}

function isEligibleWorkSet(
  setRole: HistoryExerciseSummary['sets'][number]['setRole'],
): boolean {
  return setRole !== 'warmup' && setRole !== 'optional';
}

function resolveSetMinimumTarget(
  setItem: HistoryExerciseSummary['sets'][number],
  exercise: HistoryExerciseSummary,
): number {
  return (
    setItem.targetRepsMin ??
    setItem.targetReps ??
    exercise.targetRepsMin ??
    exercise.targetReps ??
    0
  );
}

function resolveSetTopTarget(
  setItem: HistoryExerciseSummary['sets'][number],
  exercise: HistoryExerciseSummary,
): number {
  return (
    setItem.targetRepsMax ??
    setItem.targetRepsMin ??
    setItem.targetReps ??
    exercise.targetRepsMax ??
    exercise.targetRepsMin ??
    exercise.targetReps ??
    0
  );
}

function buildExerciseExposure(
  session: HistorySession,
  exercise: HistoryExerciseSummary,
  capability: ExerciseCapability | undefined,
): ExerciseExposure {
  const eligibleSets = exercise.sets.filter(
    (setItem) => setItem.isCompleted && isEligibleWorkSet(setItem.setRole),
  );
  const bestLoad = eligibleSets.reduce(
    (bestValue, setItem) => Math.max(bestValue, setItem.weight),
    0,
  );
  const bestRepsAtBestLoad = eligibleSets
    .filter((setItem) => setItem.weight === bestLoad)
    .reduce((bestValue, setItem) => Math.max(bestValue, setItem.reps), 0);
  const bestEstimatedOneRepMax = eligibleSets.reduce<number | null>(
    (bestValue, setItem) => {
      const estimate = estimateOneRepMax(
        setItem.weight,
        setItem.reps,
        capability?.strengthEstimationMode ?? 'limited',
      );

      if (estimate === null) {
        return bestValue;
      }

      return bestValue === null ? estimate : Math.max(bestValue, estimate);
    },
    null,
  );
  const actualRirs = eligibleSets
    .map((setItem) => setItem.actualRir)
    .filter((value): value is number => value !== null);
  const targetCompletionRatios = eligibleSets
    .map((setItem) => {
      const targetReps = resolveSetTopTarget(setItem, exercise);

      if (!targetReps || targetReps <= 0) {
        return null;
      }

      return Math.min(1, setItem.reps / targetReps);
    })
    .filter((value): value is number => value !== null);
  const performanceReferenceSeries = eligibleSets
    .map((setItem) => {
      const estimatedOneRepMax = estimateOneRepMax(
        setItem.weight,
        setItem.reps,
        capability?.strengthEstimationMode ?? 'limited',
      );

      return estimatedOneRepMax ?? setItem.weight * Math.max(setItem.reps, 1);
    })
    .filter((value) => value > 0);

  return {
    sessionId: session.id,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    routineId: session.routineId,
    routineName: session.routineName,
    startTime: session.startTime,
    progressionPolicy: exercise.progressionPolicy ?? 'double_progression',
    targetRir: exercise.targetRir ?? null,
    targetSets: exercise.targetSets,
    targetRepsMin: exercise.targetRepsMin ?? exercise.targetReps ?? null,
    targetRepsMax:
      exercise.targetRepsMax ??
      exercise.targetRepsMin ??
      exercise.targetReps ??
      null,
    sessionVolume: exercise.totalVolume,
    completedSetCount: exercise.completedSets,
    eligibleSetCount: eligibleSets.length,
    eligibleSets,
    bestLoad,
    bestRepsAtBestLoad,
    bestEstimatedOneRepMax,
    allTopRangeHits:
      eligibleSets.length > 0 &&
      eligibleSets.every((setItem) => {
        const topTarget = resolveSetTopTarget(setItem, exercise);
        return topTarget > 0 && setItem.reps >= topTarget;
      }),
    targetHit:
      eligibleSets.length > 0 &&
      eligibleSets.every((setItem) => {
        const minimumTarget = resolveSetMinimumTarget(setItem, exercise);

        return minimumTarget <= 0 || setItem.reps >= minimumTarget;
      }),
    anyMajorMiss: eligibleSets.some((setItem) => {
      const minimumTarget = resolveSetMinimumTarget(setItem, exercise);
      return minimumTarget > 0 && setItem.reps <= minimumTarget - 3;
    }),
    workSetMissCount: eligibleSets.filter((setItem) => {
      const minimumTarget = resolveSetMinimumTarget(setItem, exercise);
      return minimumTarget > 0 && setItem.reps < minimumTarget;
    }).length,
    averageActualRir: calculateAverage(actualRirs),
    averagePlannedRir:
      exercise.targetRir === null || exercise.targetRir === undefined
        ? null
        : exercise.targetRir,
    averageTargetCompletion: calculateAverage(targetCompletionRatios),
    performanceVariability: calculateCoefficientOfVariation(
      performanceReferenceSeries,
    ),
  };
}

export function buildExerciseExposures(
  sessions: HistorySession[],
  capabilitiesByExerciseId: Record<string, ExerciseCapability>,
): ExerciseExposure[] {
  return sessions
    .filter((session) => session.endTime !== null)
    .flatMap((session) =>
      session.exercises.map((exercise) =>
        buildExerciseExposure(
          session,
          exercise,
          capabilitiesByExerciseId[exercise.exerciseId],
        ),
      ),
    )
    .sort((left, right) => right.startTime - left.startTime);
}

export function buildExerciseExposureIndex(
  exposures: ExerciseExposure[],
): Record<string, ExerciseExposure[]> {
  return exposures.reduce<Record<string, ExerciseExposure[]>>(
    (index, exposure) => {
      index[exposure.exerciseId] = [
        ...(index[exposure.exerciseId] ?? []),
        exposure,
      ];
      return index;
    },
    {},
  );
}
