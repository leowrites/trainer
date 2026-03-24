/**
 * Session intelligence hook.
 *
 * CALLING SPEC:
 * - `useSessionIntelligence(session, allSessions, goalViewModels, unit)`
 *   derives PRs, negative signals, prescriptions, and goal deltas for a
 *   completed workout session.
 * - Depends on caller-provided history, user weight unit, exercise
 *   capabilities, and typed goals.
 * - Side effects: none beyond hook reads.
 */

import { useMemo } from 'react';

import type { HistorySession, WeightUnit } from '@features/analytics';
import {
  buildSessionClassifications,
  buildSessionRecordBadges,
} from '../classifiers/session-signals';
import {
  buildExerciseExposureIndex,
  buildExerciseExposures,
} from '../metrics/exposures';
import { buildSessionPrescriptions } from '../prescriptions/recommendations';
import type {
  IntelligenceBadge,
  SessionIntelligence,
  TrainingGoalViewModel,
} from '../types';
import { useExerciseCapabilities } from './use-exercise-capabilities';

export function useSessionIntelligence(
  session: HistorySession | null,
  allSessions: HistorySession[],
  goalViewModels: TrainingGoalViewModel[],
  unit: WeightUnit,
  options: {
    capabilitiesByExerciseId?: ReturnType<
      typeof useExerciseCapabilities
    >['capabilitiesByExerciseId'];
  } = {},
): SessionIntelligence {
  const { capabilitiesByExerciseId: loadedCapabilitiesByExerciseId } =
    useExerciseCapabilities();
  const capabilitiesByExerciseId =
    options.capabilitiesByExerciseId ?? loadedCapabilitiesByExerciseId;

  return useMemo(() => {
    if (!session) {
      return {
        recordBadges: [],
        negativeSignals: [],
        prescriptions: [],
        classifications: [],
        goalDeltas: [],
      };
    }

    const exposuresByExerciseId = buildExerciseExposureIndex(
      buildExerciseExposures(allSessions, capabilitiesByExerciseId),
    );
    const classifications = buildSessionClassifications(
      session,
      exposuresByExerciseId,
    );
    const negativeSignals: IntelligenceBadge[] = classifications.flatMap(
      (classification) => {
        const badges: IntelligenceBadge[] = [];

        if (classification.targetMiss !== 'none') {
          badges.push({
            id: `miss-${classification.exerciseId}`,
            label: 'Target Miss',
            detail: classification.reason,
            tone: 'error',
            exerciseId: classification.exerciseId,
            exerciseName: classification.exerciseName,
          });
        }

        if (classification.overshotEffort) {
          badges.push({
            id: `effort-${classification.exerciseId}`,
            label: 'Overshot Effort',
            detail: classification.reason,
            tone: 'warning',
            exerciseId: classification.exerciseId,
            exerciseName: classification.exerciseName,
          });
        }

        if (classification.fatigueFlag) {
          badges.push({
            id: `fatigue-${classification.exerciseId}`,
            label: 'Fatigue Flag',
            detail: `${classification.exerciseName} has been flagged on consecutive exposures.`,
            tone: 'warning',
            exerciseId: classification.exerciseId,
            exerciseName: classification.exerciseName,
          });
        }

        if (classification.stallFlag) {
          badges.push({
            id: `stall-${classification.exerciseId}`,
            label: 'Stall Flag',
            detail: `${classification.exerciseName} has gone several exposures without meaningful progress.`,
            tone: 'muted',
            exerciseId: classification.exerciseId,
            exerciseName: classification.exerciseName,
          });
        }

        if (classification.plateauFlag) {
          badges.push({
            id: `plateau-${classification.exerciseId}`,
            label: 'Plateau Flag',
            detail: `${classification.exerciseName} has a longer no-progress window than a simple stall.`,
            tone: 'muted',
            exerciseId: classification.exerciseId,
            exerciseName: classification.exerciseName,
          });
        }

        return badges;
      },
    );

    return {
      recordBadges: buildSessionRecordBadges(
        session,
        exposuresByExerciseId,
        capabilitiesByExerciseId,
      ),
      negativeSignals,
      prescriptions: buildSessionPrescriptions(
        session,
        classifications,
        exposuresByExerciseId,
        unit,
      ),
      classifications,
      goalDeltas: goalViewModels
        .filter(
          (goalViewModel) => goalViewModel.progress.quality.level !== 'low',
        )
        .map((goalViewModel) => goalViewModel.progress)
        .slice(0, 3),
    };
  }, [allSessions, capabilitiesByExerciseId, goalViewModels, session, unit]);
}
