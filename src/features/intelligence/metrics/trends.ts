/**
 * Trend summaries.
 *
 * CALLING SPEC:
 * - `buildExerciseTrendSummaries(exposures)` and `buildRoutineTrendSummaries`
 *   produce plain-language summaries for overview surfaces.
 * - Internal calculations may use technical signals, but returned copy should
 *   stay user-friendly.
 * - Side effects: none.
 */

import type { HistorySession } from '@features/analytics';
import {
  EXERCISE_SMOOTHING_WINDOW,
  EXERCISE_TREND_WINDOW,
  INCONSISTENT_LOGGING_ELIGIBLE_SET_THRESHOLD,
  RECENT_INTERRUPTION_DAYS,
  ROUTINE_TREND_WINDOW_DAYS,
} from '../constants';
import type {
  DataQuality,
  ExerciseCapability,
  ExerciseExposure,
  ExerciseTrendSummary,
  QualityReason,
  RoutineTrendSummary,
} from '../types';

function median(values: number[]): number {
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
  }

  return sortedValues[middleIndex] ?? 0;
}

function rollingMedian(values: number[], windowSize: number): number[] {
  return values.map((_, index) =>
    median(values.slice(Math.max(0, index - windowSize + 1), index + 1)),
  );
}

function buildQuality(
  exposures: ExerciseExposure[],
  capability: ExerciseCapability | undefined,
): DataQuality {
  const reasons: QualityReason[] = [];
  const missingRirCount = exposures.filter(
    (exposure) => exposure.averageActualRir === null,
  ).length;
  const eligibleWorkRatio =
    exposures.length === 0
      ? 0
      : exposures.filter((exposure) => exposure.eligibleSetCount > 0).length /
        exposures.length;
  const gapDays = exposures
    .slice(1)
    .map(
      (exposure, index) =>
        (exposures[index]?.startTime - exposure.startTime) /
        (24 * 60 * 60 * 1000),
    );

  if (exposures.length < 3) {
    reasons.push('too_few_exposures');
  }

  if (missingRirCount > 0) {
    reasons.push('missing_rir');
  }

  if (capability?.strengthEstimationMode === 'limited') {
    reasons.push('limited_strength_estimation');
  }

  if (eligibleWorkRatio < INCONSISTENT_LOGGING_ELIGIBLE_SET_THRESHOLD) {
    reasons.push('inconsistent_logging');
  }

  if (gapDays.some((gap) => gap > RECENT_INTERRUPTION_DAYS)) {
    reasons.push('recent_interruption');
  }

  return {
    level:
      exposures.length >= 5 &&
      missingRirCount === 0 &&
      !reasons.includes('recent_interruption') &&
      !reasons.includes('inconsistent_logging')
        ? 'high'
        : exposures.length >= 3
          ? 'medium'
          : 'low',
    reasons,
  };
}

function formatSignedPercentChange(changeRatio: number): string {
  return `${changeRatio >= 0 ? '+' : ''}${(changeRatio * 100).toFixed(1)}%`;
}

function calculateAverage(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildConsistencyLabel(variability: number | null): string {
  if (variability === null) {
    return 'less established';
  }

  if (variability <= 0.05) {
    return 'very consistent';
  }

  if (variability <= 0.12) {
    return 'fairly consistent';
  }

  return 'more variable';
}

function buildExerciseSummary(
  exerciseName: string,
  strengthChangeRatio: number | null,
  volumeChangeRatio: number,
  targetHitRate: number | null,
  averageRir: number | null,
  averageGapDays: number | null,
  variability: number | null,
): string {
  const trendMetric =
    strengthChangeRatio !== null
      ? `estimated strength ${formatSignedPercentChange(strengthChangeRatio)}`
      : `work volume ${formatSignedPercentChange(volumeChangeRatio)}`;
  const hitRateText =
    targetHitRate === null
      ? 'target hits are still building'
      : `target hit rate is ${Math.round(targetHitRate * 100)}%`;
  const rirText =
    averageRir === null
      ? 'effort data is limited'
      : `average RIR is ${averageRir.toFixed(1)}`;
  const cadenceText =
    averageGapDays === null
      ? 'cadence is still emerging'
      : `you are returning every ${averageGapDays.toFixed(1)} days`;

  return `${exerciseName} is ${buildConsistencyLabel(
    variability,
  )}: ${trendMetric}, ${hitRateText}, ${rirText}, and ${cadenceText}.`;
}

export function buildExerciseTrendSummaries(
  exposuresByExerciseId: Record<string, ExerciseExposure[]>,
  capabilitiesByExerciseId: Record<string, ExerciseCapability>,
): ExerciseTrendSummary[] {
  return Object.entries(exposuresByExerciseId)
    .map(([exerciseId, exposures]) => {
      const recentExposures = exposures
        .slice(0, EXERCISE_TREND_WINDOW)
        .reverse();
      const capability = capabilitiesByExerciseId[exerciseId];
      const e1rmSeries = recentExposures
        .map((exposure) => exposure.bestEstimatedOneRepMax)
        .filter((value): value is number => value !== null);
      const volumeSeries = recentExposures.map(
        (exposure) => exposure.sessionVolume,
      );
      const smoothedStrengthSeries = rollingMedian(
        e1rmSeries,
        EXERCISE_SMOOTHING_WINDOW,
      );
      const smoothedVolumeSeries = rollingMedian(
        volumeSeries,
        EXERCISE_SMOOTHING_WINDOW,
      );
      const latestStrength = smoothedStrengthSeries.at(-1) ?? null;
      const startingStrength = smoothedStrengthSeries.at(0) ?? latestStrength;
      const latestVolume = smoothedVolumeSeries.at(-1) ?? 0;
      const startingVolume = smoothedVolumeSeries.at(0) ?? latestVolume;
      const strengthChangeRatio =
        latestStrength === null ||
        startingStrength === null ||
        startingStrength <= 0
          ? null
          : (latestStrength - startingStrength) / startingStrength;
      const volumeChangeRatio =
        startingVolume <= 0
          ? 0
          : (latestVolume - startingVolume) / startingVolume;
      const rirValues = recentExposures
        .map((exposure) => exposure.averageActualRir)
        .filter((value): value is number => value !== null);
      const targetHitRate = calculateAverage(
        recentExposures.map((exposure) => (exposure.targetHit ? 1 : 0)),
      );
      const gapDays = recentExposures
        .slice(1)
        .map(
          (exposure, index) =>
            (exposure.startTime - recentExposures[index]!.startTime) /
            (24 * 60 * 60 * 1000),
        )
        .map((gap) => Math.abs(gap));
      const variability =
        calculateAverage(
          recentExposures
            .map((exposure) => exposure.performanceVariability)
            .filter((value): value is number => value !== null),
        ) ?? null;

      return {
        exerciseId,
        exerciseName: recentExposures[0]?.exerciseName ?? 'Exercise',
        summary: buildExerciseSummary(
          recentExposures[0]?.exerciseName ?? 'Exercise',
          strengthChangeRatio,
          volumeChangeRatio,
          targetHitRate,
          calculateAverage(rirValues),
          calculateAverage(gapDays),
          variability,
        ),
        quality: buildQuality(recentExposures, capability),
      };
    })
    .sort((left, right) => left.exerciseName.localeCompare(right.exerciseName));
}

export function buildRoutineTrendSummaries(
  sessions: HistorySession[],
  exposuresByExerciseId: Record<string, ExerciseExposure[]>,
  capabilitiesByExerciseId: Record<string, ExerciseCapability>,
): RoutineTrendSummary[] {
  const now = Date.now();
  const recentSessions = sessions.filter(
    (session) =>
      session.routineId !== null &&
      now - session.startTime <=
        ROUTINE_TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const sessionsByRoutineId = recentSessions.reduce<
    Record<string, HistorySession[]>
  >((index, session) => {
    if (!session.routineId) {
      return index;
    }

    index[session.routineId] = [...(index[session.routineId] ?? []), session];
    return index;
  }, {});

  return Object.entries(sessionsByRoutineId)
    .map(([routineId, routineSessions]) => {
      const routineExposureEntries = Object.values(exposuresByExerciseId)
        .flat()
        .filter((exposure) => exposure.routineId === routineId);
      const completionRate =
        routineSessions.reduce(
          (sum, session) =>
            sum +
            (session.totalSets === 0
              ? 0
              : session.totalCompletedSets / session.totalSets),
          0,
        ) / routineSessions.length;
      const averageDuration =
        calculateAverage(
          routineSessions
            .map((session) => session.durationMinutes)
            .filter((value): value is number => value !== null),
        ) ?? 0;
      const routineExercises = new Map<
        string,
        { latest: ExerciseExposure; previous: ExerciseExposure | null }
      >();

      for (const exposure of routineExposureEntries) {
        const current = routineExercises.get(exposure.exerciseId);

        if (!current) {
          routineExercises.set(exposure.exerciseId, {
            latest: exposure,
            previous: null,
          });
          continue;
        }

        if (current.previous === null) {
          current.previous = exposure;
        }
      }

      const progressedCount = [...routineExercises.values()].filter(
        ({ latest, previous }) =>
          previous !== null &&
          ((latest.bestEstimatedOneRepMax ?? latest.bestLoad) >
            (previous.bestEstimatedOneRepMax ?? previous.bestLoad) ||
            latest.sessionVolume > previous.sessionVolume),
      ).length;
      const stalledCount = [...routineExercises.values()].filter(
        ({ latest, previous }) =>
          previous !== null &&
          latest.sessionVolume <= previous.sessionVolume &&
          (latest.bestEstimatedOneRepMax ?? latest.bestLoad) <=
            (previous.bestEstimatedOneRepMax ?? previous.bestLoad),
      ).length;
      const weeklySetVolumeByMuscleGroup = routineExposureEntries.reduce<
        Record<string, number>
      >((index, exposure) => {
        const muscleGroup =
          capabilitiesByExerciseId[exposure.exerciseId]?.muscleGroup;

        if (!muscleGroup) {
          return index;
        }

        index[muscleGroup] =
          (index[muscleGroup] ?? 0) + exposure.eligibleSetCount;
        return index;
      }, {});
      const topMuscleGroup = Object.entries(weeklySetVolumeByMuscleGroup).sort(
        (left, right) => right[1] - left[1],
      )[0];
      const sessionGapDays = routineSessions
        .slice(1)
        .map(
          (session, index) =>
            Math.abs(session.startTime - routineSessions[index]!.startTime) /
            (24 * 60 * 60 * 1000),
        );
      const fatigueSignals = routineExposureEntries.filter(
        (exposure) =>
          exposure.workSetMissCount >= 2 ||
          (exposure.targetRir !== null &&
            exposure.averageActualRir !== null &&
            exposure.averageActualRir <= exposure.targetRir - 2),
      ).length;
      const totalTrackedExercises = Math.max(1, routineExercises.size);

      return {
        routineId,
        routineName: routineSessions[0]?.routineName ?? 'Routine',
        summary: `${
          routineSessions[0]?.routineName ?? 'Routine'
        } averages ${Math.round(completionRate * 100)}% completion over ${averageDuration.toFixed(
          0,
        )} minutes. ${progressedCount} of ${totalTrackedExercises} tracked lifts are moving up, ${stalledCount} look stalled, fatigue flags showed up ${fatigueSignals} times, and ${
          topMuscleGroup
            ? `${topMuscleGroup[0]} carried the most weekly set volume`
            : 'muscle-group volume is still sparse'
        }. ${
          sessionGapDays.length === 0
            ? 'Exposure consistency is still forming.'
            : `Exposure spacing averages ${calculateAverage(
                sessionGapDays,
              )?.toFixed(1)} days.`
        }`,
        quality: {
          level: (routineSessions.length >= 3 && fatigueSignals === 0
            ? 'high'
            : routineSessions.length >= 2
              ? 'medium'
              : 'low') as DataQuality['level'],
          reasons: [
            ...(routineSessions.length >= 2
              ? []
              : (['too_few_exposures'] as QualityReason[])),
            ...(sessionGapDays.some((gap) => gap > RECENT_INTERRUPTION_DAYS)
              ? (['recent_interruption'] as QualityReason[])
              : []),
          ],
        },
      };
    })
    .sort((left, right) => left.routineName.localeCompare(right.routineName));
}
