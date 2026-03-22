/**
 * Prescription rules.
 *
 * CALLING SPEC:
 * - `buildSessionPrescriptions(session, classifications, exposuresByExerciseId, unit)`
 *   returns conservative next-session recommendations per exercise.
 * - Recommendations are computed on read and include confidence metadata.
 * - Side effects: none.
 */

import type { HistorySession, WeightUnit } from '@features/analytics';
import {
  ADHERENCE_CAP_THRESHOLD,
  ADHERENCE_EXPECTED_SESSIONS_PER_WEEK,
  ADHERENCE_WINDOW_DAYS,
  DEFAULT_KG_INCREMENT,
  DEFAULT_LB_INCREMENT,
  INCONSISTENT_LOGGING_ELIGIBLE_SET_THRESHOLD,
  RECENT_INTERRUPTION_DAYS,
} from '../constants';
import type {
  DataQuality,
  ExerciseClassification,
  ExerciseExposure,
  SessionPrescription,
} from '../types';

function resolveWeightIncrement(unit: WeightUnit): number {
  return unit === 'lb' ? DEFAULT_LB_INCREMENT : DEFAULT_KG_INCREMENT;
}

function buildQuality(
  exposures: ExerciseExposure[],
  hasMissingRir: boolean,
): DataQuality {
  const gapDays = exposures
    .slice(1)
    .map(
      (exposure, index) =>
        (exposures[index]!.startTime - exposure.startTime) /
        (24 * 60 * 60 * 1000),
    );
  const eligibleRatio =
    exposures.length === 0
      ? 0
      : exposures.filter((exposure) => exposure.eligibleSetCount > 0).length /
        exposures.length;

  return {
    level:
      exposures.length >= 4 &&
      !hasMissingRir &&
      !gapDays.some((gap) => gap > RECENT_INTERRUPTION_DAYS) &&
      eligibleRatio >= INCONSISTENT_LOGGING_ELIGIBLE_SET_THRESHOLD
        ? 'high'
        : exposures.length >= 2
          ? 'medium'
          : 'low',
    reasons: [
      ...(exposures.length < 2 ? (['too_few_exposures'] as const) : []),
      ...(hasMissingRir ? (['missing_rir'] as const) : []),
      ...(gapDays.some((gap) => gap > RECENT_INTERRUPTION_DAYS)
        ? (['recent_interruption'] as const)
        : []),
      ...(eligibleRatio < INCONSISTENT_LOGGING_ELIGIBLE_SET_THRESHOLD
        ? (['inconsistent_logging'] as const)
        : []),
    ],
  };
}

function buildAdherenceRatio(
  session: HistorySession,
  allExposures: ExerciseExposure[],
): number {
  const windowStart =
    session.startTime - ADHERENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentSessions = new Set(
    allExposures
      .filter((exposure) => exposure.startTime >= windowStart)
      .map((exposure) => exposure.sessionId),
  );
  const oldestRecentExposure = allExposures
    .filter((exposure) => exposure.startTime >= windowStart)
    .at(-1);
  const activeWindowDays =
    oldestRecentExposure === undefined
      ? 7
      : Math.max(
          7,
          Math.ceil(
            (session.startTime - oldestRecentExposure.startTime) /
              (24 * 60 * 60 * 1000),
          ) + 1,
        );
  const activeWindowWeeks = Math.max(1, Math.ceil(activeWindowDays / 7));
  const expectedSessions =
    activeWindowWeeks * ADHERENCE_EXPECTED_SESSIONS_PER_WEEK;

  return Math.min(1, recentSessions.size / expectedSessions);
}

export function buildSessionPrescriptions(
  session: HistorySession,
  classifications: ExerciseClassification[],
  exposuresByExerciseId: Record<string, ExerciseExposure[]>,
  unit: WeightUnit,
): SessionPrescription[] {
  const allExposures = Object.values(exposuresByExerciseId).flat();
  const adherenceRatio = buildAdherenceRatio(session, allExposures);
  const weightIncrement = resolveWeightIncrement(unit);

  return session.exercises.map((exercise) => {
    const exposures = exposuresByExerciseId[exercise.exerciseId] ?? [];
    const currentExposure = exposures.find(
      (exposure) => exposure.sessionId === session.id,
    );
    const classification = classifications.find(
      (item) => item.exerciseId === exercise.exerciseId,
    );
    const currentWeight = currentExposure?.bestLoad ?? 0;
    const hasMissingRir = currentExposure?.averageActualRir === null;
    const quality = buildQuality(exposures, hasMissingRir);

    if (!currentExposure || !classification) {
      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        action: 'hold',
        currentWeight,
        recommendedWeight: currentWeight,
        targetRepsMin: exercise.targetRepsMin ?? exercise.targetReps ?? null,
        targetRepsMax:
          exercise.targetRepsMax ??
          exercise.targetRepsMin ??
          exercise.targetReps ??
          null,
        reason: 'Not enough clean data yet. Hold load and keep logging.',
        quality,
      };
    }

    let action: SessionPrescription['action'] = 'hold';
    let recommendedWeight = currentWeight;
    let reason = 'Stay with the current load next time.';

    if (currentExposure.progressionPolicy === 'double_progression') {
      if (
        currentExposure.allTopRangeHits &&
        !classification.overshotEffort &&
        classification.targetMiss === 'none'
      ) {
        action = 'increase';
        recommendedWeight = currentWeight + weightIncrement;
        reason =
          'All eligible work sets reached the top of the range at acceptable effort.';
      } else if (
        classification.targetMiss === 'major' ||
        classification.targetMiss === 'moderate'
      ) {
        action = 'decrease';
        recommendedWeight = Math.max(0, currentWeight - weightIncrement);
        reason = 'Multiple eligible work sets missed the programmed floor.';
      } else {
        reason = 'You stayed close enough to target to keep the load steady.';
      }
    } else {
      if (
        classification.targetMiss === 'none' &&
        !classification.overshotEffort &&
        !classification.fatigueFlag
      ) {
        action = 'increase';
        recommendedWeight = currentWeight + weightIncrement;
        reason =
          'The top set and backoff work held up, so the top set can move up.';
      } else if (
        classification.targetMiss === 'major' ||
        classification.fatigueFlag
      ) {
        action = 'decrease';
        recommendedWeight = Math.max(0, currentWeight - weightIncrement);
        reason =
          'Backoff performance suggests fatigue. Take a conservative step down.';
      } else {
        reason =
          'Hold the top set and confirm backoff quality on the next exposure.';
      }
    }

    if (adherenceRatio < ADHERENCE_CAP_THRESHOLD && action === 'increase') {
      if (quality.level !== 'high') {
        action = 'hold';
        recommendedWeight = currentWeight;
      }

      reason = `${reason} Recent adherence is mixed, so progression stays conservative.`;
    }

    return {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      action,
      currentWeight,
      recommendedWeight,
      targetRepsMin: exercise.targetRepsMin ?? exercise.targetReps ?? null,
      targetRepsMax:
        exercise.targetRepsMax ??
        exercise.targetRepsMin ??
        exercise.targetReps ??
        null,
      reason,
      quality,
    };
  });
}
