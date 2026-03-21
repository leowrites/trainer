/**
 * Workout summary domain helpers.
 *
 * CALLING SPEC:
 * - `buildWorkoutRecordBadges(session, allSessions, unit)` returns earned
 *   summary badges for the completed session.
 * - `getWorkoutFeedbackOptions(metric)` returns the 1-5 quick-select scale for
 *   effort or fatigue prompts.
 * - All functions are deterministic and side-effect free.
 */

import type {
  HistoryExerciseSummary,
  HistorySession,
  WeightUnit,
} from '@features/analytics';
import type {
  WorkoutFeedbackMetric,
  WorkoutFeedbackOption,
  WorkoutRecordBadge,
} from '../summary-types';

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatWeight(value: number, unit: WeightUnit): string {
  return `${formatCompactNumber(value)} ${unit}`;
}

function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) {
    return 0;
  }

  return weight * (1 + reps / 30);
}

function getCompletedSessions(
  sessions: HistorySession[],
  currentSessionId: string,
): HistorySession[] {
  return sessions.filter(
    (session) => session.id !== currentSessionId && session.endTime !== null,
  );
}

function buildExerciseHistoryIndex(
  sessions: HistorySession[],
): Map<string, HistoryExerciseSummary[]> {
  const exerciseHistoryById = new Map<string, HistoryExerciseSummary[]>();

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      const history = exerciseHistoryById.get(exercise.exerciseId) ?? [];
      history.push(exercise);
      exerciseHistoryById.set(exercise.exerciseId, history);
    }
  }

  return exerciseHistoryById;
}

function buildSessionVolumeBadge(
  session: HistorySession,
  completedSessions: HistorySession[],
  unit: WeightUnit,
): WorkoutRecordBadge | null {
  const priorBestVolume = completedSessions.reduce(
    (bestVolume, previousSession) =>
      Math.max(bestVolume, previousSession.totalVolume),
    0,
  );

  if (session.totalVolume <= 0 || session.totalVolume <= priorBestVolume) {
    return null;
  }

  return {
    id: 'session-volume',
    label: 'Session Volume',
    detail: `New best total at ${formatWeight(session.totalVolume, unit)}.`,
    tone: 'accent',
    exerciseId: null,
    exerciseName: null,
  };
}

function buildExerciseVolumeBadge(
  exercise: HistoryExerciseSummary,
  previousExercises: HistoryExerciseSummary[],
  unit: WeightUnit,
): WorkoutRecordBadge | null {
  const priorBestVolume = previousExercises.reduce(
    (bestVolume, previousExercise) =>
      Math.max(bestVolume, previousExercise.totalVolume),
    0,
  );

  if (exercise.totalVolume <= 0 || exercise.totalVolume <= priorBestVolume) {
    return null;
  }

  return {
    id: `volume-${exercise.exerciseId}`,
    label: 'Volume PR',
    detail: `${exercise.exerciseName} hit ${formatWeight(exercise.totalVolume, unit)}.`,
    tone: 'warning',
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
  };
}

function buildEstimatedOneRepMaxBadge(
  exercise: HistoryExerciseSummary,
  previousExercises: HistoryExerciseSummary[],
  unit: WeightUnit,
): WorkoutRecordBadge | null {
  const currentBestOneRepMax = exercise.sets.reduce((bestEstimate, setItem) => {
    if (!setItem.isCompleted) {
      return bestEstimate;
    }

    return Math.max(
      bestEstimate,
      estimateOneRepMax(setItem.weight, setItem.reps),
    );
  }, 0);

  const previousBestOneRepMax = previousExercises.reduce(
    (bestEstimate, previousExercise) =>
      previousExercise.sets.reduce((exerciseBest, setItem) => {
        if (!setItem.isCompleted) {
          return exerciseBest;
        }

        return Math.max(
          exerciseBest,
          estimateOneRepMax(setItem.weight, setItem.reps),
        );
      }, bestEstimate),
    0,
  );

  if (
    currentBestOneRepMax <= 0 ||
    currentBestOneRepMax <= previousBestOneRepMax
  ) {
    return null;
  }

  return {
    id: `one-rm-${exercise.exerciseId}`,
    label: 'Estimated 1RM',
    detail: `${exercise.exerciseName} projects to ${formatWeight(
      currentBestOneRepMax,
      unit,
    )}.`,
    tone: 'accent',
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
  };
}

function buildPlateauBrokenBadge(
  exercise: HistoryExerciseSummary,
  previousExercises: HistoryExerciseSummary[],
  unit: WeightUnit,
): WorkoutRecordBadge | null {
  if (previousExercises.length < 3) {
    return null;
  }

  const priorBestVolume = previousExercises.reduce(
    (bestVolume, previousExercise) =>
      Math.max(bestVolume, previousExercise.totalVolume),
    0,
  );
  const recentWindow = previousExercises.slice(0, 2);
  const stalledRecently = recentWindow.every(
    (previousExercise) => previousExercise.totalVolume < priorBestVolume,
  );

  if (!stalledRecently || exercise.totalVolume <= priorBestVolume) {
    return null;
  }

  return {
    id: `plateau-${exercise.exerciseId}`,
    label: 'Plateau Broken',
    detail: `${exercise.exerciseName} cleared its previous volume ceiling at ${formatWeight(
      exercise.totalVolume,
      unit,
    )}.`,
    tone: 'error',
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
  };
}

export function buildWorkoutRecordBadges(
  session: HistorySession,
  allSessions: HistorySession[],
  unit: WeightUnit,
): WorkoutRecordBadge[] {
  const completedSessions = getCompletedSessions(allSessions, session.id);
  const exerciseHistoryById = buildExerciseHistoryIndex(completedSessions);
  const badges: WorkoutRecordBadge[] = [];
  const sessionVolumeBadge = buildSessionVolumeBadge(
    session,
    completedSessions,
    unit,
  );

  if (sessionVolumeBadge) {
    badges.push(sessionVolumeBadge);
  }

  for (const exercise of session.exercises) {
    const previousExercises =
      exerciseHistoryById.get(exercise.exerciseId) ?? [];

    const exerciseBadges = [
      buildEstimatedOneRepMaxBadge(exercise, previousExercises, unit),
      buildExerciseVolumeBadge(exercise, previousExercises, unit),
      buildPlateauBrokenBadge(exercise, previousExercises, unit),
    ].filter((badge): badge is WorkoutRecordBadge => badge !== null);

    badges.push(...exerciseBadges);
  }

  return badges.slice(0, 6);
}

export function getWorkoutFeedbackOptions(
  metric: WorkoutFeedbackMetric,
): WorkoutFeedbackOption[] {
  if (metric === 'effort') {
    return [
      { value: 1, shortLabel: '1', title: 'Cruise' },
      { value: 2, shortLabel: '2', title: 'Smooth' },
      { value: 3, shortLabel: '3', title: 'Strong' },
      { value: 4, shortLabel: '4', title: 'Hard' },
      { value: 5, shortLabel: '5', title: 'Max' },
    ];
  }

  return [
    { value: 1, shortLabel: '1', title: 'Fresh' },
    { value: 2, shortLabel: '2', title: 'Warm' },
    { value: 3, shortLabel: '3', title: 'Worked' },
    { value: 4, shortLabel: '4', title: 'Heavy' },
    { value: 5, shortLabel: '5', title: 'Drained' },
  ];
}
