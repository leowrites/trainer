/**
 * Session classifiers.
 *
 * CALLING SPEC:
 * - `buildSessionClassifications(exposuresByExerciseId)` derives distinct
 *   target-miss, overshot-effort, fatigue, stall, and plateau states.
 * - `buildSessionRecordBadges(currentSession, exposuresByExerciseId, capabilities)`
 *   derives non-canonical PR badges from eligible work-set history.
 * - Side effects: none.
 */

import type { HistorySession } from '@features/analytics';
import {
  FATIGUE_FLAG_CONSECUTIVE_EXPOSURES,
  HARD_PR_IMPROVEMENT_THRESHOLD,
  MEANINGFUL_PROGRESS_THRESHOLD,
  OVERSHOT_EFFORT_RIR_DELTA,
  PLATEAU_WINDOW_EXPOSURES,
  STALL_WINDOW_EXPOSURES,
} from '../constants';
import type {
  ExerciseCapability,
  ExerciseClassification,
  ExerciseExposure,
  IntelligenceBadge,
} from '../types';

function buildSessionVolumeIndex(
  exposuresByExerciseId: Record<string, ExerciseExposure[]>,
): Record<string, number> {
  return Object.values(exposuresByExerciseId)
    .flat()
    .reduce<Record<string, number>>((index, exposure) => {
      index[exposure.sessionId] =
        (index[exposure.sessionId] ?? 0) + exposure.sessionVolume;
      return index;
    }, {});
}

function hasMeaningfulProgress(
  currentValue: number,
  previousBestValue: number,
): boolean {
  if (previousBestValue <= 0) {
    return currentValue > 0;
  }

  return (
    (currentValue - previousBestValue) / previousBestValue >
    MEANINGFUL_PROGRESS_THRESHOLD
  );
}

function countConsecutiveFlaggedExposures(
  exposures: ExerciseExposure[],
): number {
  let consecutiveCount = 0;

  for (const exposure of exposures) {
    const isFlagged =
      exposure.workSetMissCount >= 2 ||
      (exposure.targetRir !== null &&
        exposure.averageActualRir !== null &&
        exposure.averageActualRir <=
          exposure.targetRir - OVERSHOT_EFFORT_RIR_DELTA);

    if (!isFlagged) {
      break;
    }

    consecutiveCount += 1;
  }

  return consecutiveCount;
}

function buildExerciseClassification(
  currentExposure: ExerciseExposure,
  priorExposures: ExerciseExposure[],
): ExerciseClassification {
  const flaggedWindow = [currentExposure, ...priorExposures];
  const consecutiveFlags = countConsecutiveFlaggedExposures(flaggedWindow);
  const targetMiss = currentExposure.anyMajorMiss
    ? 'major'
    : currentExposure.workSetMissCount >= 2
      ? 'moderate'
      : currentExposure.workSetMissCount === 1
        ? 'minor'
        : 'none';
  const overshotEffort =
    currentExposure.targetRir !== null &&
    currentExposure.averageActualRir !== null &&
    currentExposure.averageActualRir <=
      currentExposure.targetRir - OVERSHOT_EFFORT_RIR_DELTA;
  const recentWindow = [currentExposure, ...priorExposures].slice(
    0,
    PLATEAU_WINDOW_EXPOSURES,
  );
  const previousBestLoad = priorExposures.reduce(
    (bestValue, exposure) => Math.max(bestValue, exposure.bestLoad),
    0,
  );
  const stallFlag =
    [currentExposure, ...priorExposures].slice(0, STALL_WINDOW_EXPOSURES)
      .length >= STALL_WINDOW_EXPOSURES &&
    !hasMeaningfulProgress(currentExposure.bestLoad, previousBestLoad);
  const plateauFlag =
    recentWindow.length >= PLATEAU_WINDOW_EXPOSURES &&
    !hasMeaningfulProgress(
      currentExposure.bestLoad,
      priorExposures.reduce(
        (bestValue, exposure) => Math.max(bestValue, exposure.bestLoad),
        0,
      ),
    );

  return {
    exerciseId: currentExposure.exerciseId,
    exerciseName: currentExposure.exerciseName,
    targetMiss,
    overshotEffort,
    fatigueFlag:
      consecutiveFlags >= FATIGUE_FLAG_CONSECUTIVE_EXPOSURES &&
      (targetMiss !== 'none' || overshotEffort),
    stallFlag,
    plateauFlag,
    reason:
      targetMiss !== 'none'
        ? `${currentExposure.exerciseName} missed its programmed rep floor on eligible work sets.`
        : overshotEffort
          ? `${currentExposure.exerciseName} hit the reps, but at higher effort than planned.`
          : `${currentExposure.exerciseName} stayed on target.`,
  };
}

export function buildSessionClassifications(
  currentSession: HistorySession,
  exposuresByExerciseId: Record<string, ExerciseExposure[]>,
): ExerciseClassification[] {
  return currentSession.exercises.map((exercise) => {
    const exposures = exposuresByExerciseId[exercise.exerciseId] ?? [];
    const currentExposure = exposures.find(
      (exposure) => exposure.sessionId === currentSession.id,
    );

    if (!currentExposure) {
      return {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        targetMiss: 'none',
        overshotEffort: false,
        fatigueFlag: false,
        stallFlag: false,
        plateauFlag: false,
        reason: `${exercise.exerciseName} has not been classified yet.`,
      };
    }

    const priorExposures = exposures.filter(
      (exposure) => exposure.sessionId !== currentSession.id,
    );

    return buildExerciseClassification(currentExposure, priorExposures);
  });
}

function buildBadge(
  id: string,
  label: string,
  detail: string,
  exerciseId: string | null,
  exerciseName: string | null,
  isHard = false,
): IntelligenceBadge {
  return {
    id,
    label,
    detail,
    tone: isHard ? 'accent' : 'warning',
    exerciseId,
    exerciseName,
    isHard,
  };
}

function buildRepPrBadge(
  currentExposure: ExerciseExposure,
  priorExposures: ExerciseExposure[],
  exerciseId: string,
  exerciseName: string,
): IntelligenceBadge | null {
  const currentBestRepsByLoad = currentExposure.eligibleSets.reduce<
    Record<number, number>
  >((index, setItem) => {
    index[setItem.weight] = Math.max(index[setItem.weight] ?? 0, setItem.reps);
    return index;
  }, {});
  let bestRepPr: { load: number; reps: number; previousBest: number } | null =
    null;

  for (const [weightText, reps] of Object.entries(currentBestRepsByLoad)) {
    const load = Number(weightText);
    const previousBest = priorExposures.reduce((bestValue, exposure) => {
      const matchingSets = exposure.eligibleSets.filter(
        (setItem) => setItem.weight === load,
      );

      if (matchingSets.length === 0) {
        return bestValue;
      }

      return Math.max(
        bestValue,
        ...matchingSets.map((setItem) => setItem.reps),
      );
    }, 0);

    if (previousBest <= 0 || reps <= previousBest) {
      continue;
    }

    if (
      bestRepPr === null ||
      reps - previousBest > bestRepPr.reps - bestRepPr.previousBest
    ) {
      bestRepPr = { load, reps, previousBest };
    }
  }

  if (!bestRepPr) {
    return null;
  }

  return buildBadge(
    `rep-load-${exerciseId}`,
    'Rep PR',
    `${exerciseName} matched ${bestRepPr.load} for more reps than before.`,
    exerciseId,
    exerciseName,
  );
}

function buildTargetStreakBadge(
  currentExposure: ExerciseExposure,
  priorExposures: ExerciseExposure[],
  exerciseId: string,
  exerciseName: string,
): IntelligenceBadge | null {
  if (!currentExposure.targetHit) {
    return null;
  }

  let currentStreak = 0;
  for (const exposure of [currentExposure, ...priorExposures]) {
    if (!exposure.targetHit) {
      break;
    }

    currentStreak += 1;
  }
  const previousBestStreak = priorExposures.reduce(
    (bestValue, _, index, source) => {
      let streak = 0;

      for (let cursor = index; cursor < source.length; cursor += 1) {
        if (!source[cursor]?.targetHit) {
          break;
        }

        streak += 1;
      }

      return Math.max(bestValue, streak);
    },
    0,
  );

  if (currentStreak <= previousBestStreak || currentStreak <= 1) {
    return null;
  }

  return buildBadge(
    `streak-${exerciseId}`,
    'Target Streak',
    `${exerciseName} extended its best target-hit streak to ${currentStreak} exposures.`,
    exerciseId,
    exerciseName,
  );
}

export function buildSessionRecordBadges(
  currentSession: HistorySession,
  exposuresByExerciseId: Record<string, ExerciseExposure[]>,
  capabilitiesByExerciseId: Record<string, ExerciseCapability>,
): IntelligenceBadge[] {
  const badges: IntelligenceBadge[] = [];
  const currentSessionVolume = currentSession.totalVolume;
  const previousSessionBestVolume = Object.entries(
    buildSessionVolumeIndex(exposuresByExerciseId),
  )
    .filter(([sessionId]) => sessionId !== currentSession.id)
    .reduce(
      (bestValue, [, sessionVolume]) => Math.max(bestValue, sessionVolume),
      0,
    );

  if (hasMeaningfulProgress(currentSessionVolume, previousSessionBestVolume)) {
    badges.push(
      buildBadge(
        'session-volume',
        'Session Volume',
        `Total work climbed past your previous best session volume.`,
        null,
        null,
        true,
      ),
    );
  }

  for (const exercise of currentSession.exercises) {
    const exposures = exposuresByExerciseId[exercise.exerciseId] ?? [];
    const currentExposure = exposures.find(
      (exposure) => exposure.sessionId === currentSession.id,
    );
    const priorExposures = exposures.filter(
      (exposure) => exposure.sessionId !== currentSession.id,
    );

    if (!currentExposure) {
      continue;
    }

    const priorBestLoad = priorExposures.reduce(
      (bestValue, exposure) => Math.max(bestValue, exposure.bestLoad),
      0,
    );
    if (hasMeaningfulProgress(currentExposure.bestLoad, priorBestLoad)) {
      badges.push(
        buildBadge(
          `load-${exercise.exerciseId}`,
          'Load PR',
          `${exercise.exerciseName} moved a heavier eligible work set than before.`,
          exercise.exerciseId,
          exercise.exerciseName,
          (currentExposure.bestLoad - priorBestLoad) /
            Math.max(priorBestLoad, 1) >
            HARD_PR_IMPROVEMENT_THRESHOLD,
        ),
      );
    }

    const priorBestVolume = priorExposures.reduce(
      (bestValue, exposure) => Math.max(bestValue, exposure.sessionVolume),
      0,
    );
    if (hasMeaningfulProgress(currentExposure.sessionVolume, priorBestVolume)) {
      badges.push(
        buildBadge(
          `volume-${exercise.exerciseId}`,
          'Exercise Volume',
          `${exercise.exerciseName} set a new per-session volume best.`,
          exercise.exerciseId,
          exercise.exerciseName,
        ),
      );
    }

    const repPrBadge = buildRepPrBadge(
      currentExposure,
      priorExposures,
      exercise.exerciseId,
      exercise.exerciseName,
    );
    if (repPrBadge) {
      badges.push(repPrBadge);
    }

    const targetStreakBadge = buildTargetStreakBadge(
      currentExposure,
      priorExposures,
      exercise.exerciseId,
      exercise.exerciseName,
    );
    if (targetStreakBadge) {
      badges.push(targetStreakBadge);
    }

    const capability = capabilitiesByExerciseId[exercise.exerciseId];
    if (capability?.strengthEstimationMode !== 'disabled') {
      const priorBestEstimatedOneRepMax = priorExposures.reduce(
        (bestValue, exposure) =>
          Math.max(bestValue, exposure.bestEstimatedOneRepMax ?? 0),
        0,
      );

      if (
        currentExposure.bestEstimatedOneRepMax !== null &&
        hasMeaningfulProgress(
          currentExposure.bestEstimatedOneRepMax,
          priorBestEstimatedOneRepMax,
        )
      ) {
        badges.push(
          buildBadge(
            `e1rm-${exercise.exerciseId}`,
            'Estimated 1RM',
            `${exercise.exerciseName} posted a stronger estimated max from eligible work sets.`,
            exercise.exerciseId,
            exercise.exerciseName,
            true,
          ),
        );
      }
    }
  }

  return badges.slice(0, 6);
}
