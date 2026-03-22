/**
 * Goal evaluation helpers.
 *
 * CALLING SPEC:
 * - `buildGoalProgressSummaries(goals, exposuresByExerciseId, capabilitiesByExerciseId)`
 *   evaluates typed training goals into user-facing summaries.
 * - `sanitizeTrainingGoalInput(input)` normalizes nullable fields before writes.
 * - Side effects: none.
 */

import type { TrainingGoal } from '@core/database/types';
import { ADHERENCE_WINDOW_DAYS } from '../constants';
import type {
  ExerciseCapability,
  ExerciseExposure,
  GoalProgressSummary,
  TrainingGoalInput,
  TrainingGoalViewModel,
} from '../types';

function formatGoalTitle(
  goal: TrainingGoal,
  capabilitiesByExerciseId: Record<string, ExerciseCapability>,
): string {
  if (goal.goal_type === 'volume') {
    return `${goal.muscle_group ?? 'Target muscle'} volume`;
  }

  if (goal.goal_type === 'adherence') {
    return `${goal.target_sessions_per_week ?? 0} sessions / week`;
  }

  const exerciseName =
    (goal.exercise_id &&
      capabilitiesByExerciseId[goal.exercise_id]?.exerciseName) ||
    'Exercise';
  const repsPart = goal.target_reps === null ? '' : ` x ${goal.target_reps}`;

  return `${exerciseName}${goal.target_load === null ? '' : ` ${goal.target_load}`}${repsPart}`;
}

export function sanitizeTrainingGoalInput(
  input: TrainingGoalInput,
): TrainingGoalInput {
  return {
    goalType: input.goalType,
    exerciseId: input.exerciseId ?? null,
    muscleGroup: input.muscleGroup?.trim() || null,
    targetLoad: input.targetLoad ?? null,
    targetReps: input.targetReps ?? null,
    targetSessionsPerWeek: input.targetSessionsPerWeek ?? null,
    targetSetsPerWeek: input.targetSetsPerWeek ?? null,
    targetWeeks: input.targetWeeks ?? null,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    status: input.status ?? 'active',
  };
}

function buildStrengthGoalProgress(
  goal: TrainingGoal,
  exposuresByExerciseId: Record<string, ExerciseExposure[]>,
): GoalProgressSummary {
  const exposures = goal.exercise_id
    ? (exposuresByExerciseId[goal.exercise_id] ?? [])
    : [];
  const bestExposure = exposures.reduce<ExerciseExposure | null>(
    (bestValue, exposure) => {
      if (bestValue === null) {
        return exposure;
      }

      return (exposure.bestEstimatedOneRepMax ?? exposure.bestLoad) >
        (bestValue.bestEstimatedOneRepMax ?? bestValue.bestLoad)
        ? exposure
        : bestValue;
    },
    null,
  );
  const bestLoad = bestExposure?.bestLoad ?? 0;
  const bestEstimatedOneRepMax =
    bestExposure?.bestEstimatedOneRepMax ?? bestLoad;
  const targetEstimate =
    goal.target_load === null ||
    goal.target_reps === null ||
    goal.target_reps <= 1
      ? (goal.target_load ?? 0)
      : goal.target_load * (1 + goal.target_reps / 30);
  const progressRatio =
    targetEstimate <= 0
      ? 0
      : Math.min(1, bestEstimatedOneRepMax / targetEstimate);

  return {
    id: goal.id,
    title: 'Strength goal',
    progressText:
      goal.target_load === null
        ? 'Missing target load.'
        : `Progress ${Math.round(progressRatio * 100)}% toward the target.`,
    isComplete:
      goal.target_load !== null &&
      goal.target_reps !== null &&
      exposures.some(
        (exposure) =>
          exposure.bestLoad >= goal.target_load! &&
          exposure.bestRepsAtBestLoad >= goal.target_reps!,
      ),
    quality: {
      level: exposures.length >= 3 ? 'high' : 'medium',
      reasons: exposures.length >= 3 ? [] : ['too_few_exposures'],
    },
  };
}

function buildAdherenceGoalProgress(
  goal: TrainingGoal,
  sessionsById: { startTime: number }[],
): GoalProgressSummary {
  const now = Date.now();
  const goalStart = goal.start_time ?? now;
  const goalEnd =
    goal.end_time ??
    (goal.target_weeks !== null
      ? goalStart + goal.target_weeks * 7 * 24 * 60 * 60 * 1000
      : now);

  function buildWeekKey(timestamp: number): string {
    const date = new Date(timestamp);
    const utcDay = date.getUTCDay();
    const normalizedDay = utcDay === 0 ? 7 : utcDay;
    const weekStart = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - normalizedDay + 1,
    );

    return String(weekStart);
  }

  const eligibleSessions = sessionsById.filter(
    (session) =>
      session.startTime >= goalStart &&
      session.startTime <= Math.min(goalEnd, now),
  );
  const weeksByKey = eligibleSessions.reduce<Record<string, number>>(
    (index, session) => {
      const key = buildWeekKey(session.startTime);
      index[key] = (index[key] ?? 0) + 1;
      return index;
    },
    {},
  );
  const compliantWeeks = Object.values(weeksByKey).filter(
    (count) => count >= (goal.target_sessions_per_week ?? 0),
  ).length;
  const targetWeeks =
    goal.target_weeks ??
    Math.max(
      0,
      Math.ceil(
        (Math.min(goalEnd, now) - goalStart) / (7 * 24 * 60 * 60 * 1000),
      ),
    );

  return {
    id: goal.id,
    title: 'Adherence goal',
    progressText:
      targetWeeks <= 0
        ? 'Missing target duration.'
        : `${compliantWeeks} of ${targetWeeks} goal weeks completed.`,
    isComplete: targetWeeks > 0 && compliantWeeks >= targetWeeks,
    quality: {
      level:
        Object.keys(weeksByKey).length >= Math.min(2, Math.max(targetWeeks, 1))
          ? 'high'
          : 'medium',
      reasons:
        Object.keys(weeksByKey).length === 0 ? ['too_few_exposures'] : [],
    },
  };
}

function buildVolumeGoalProgress(
  goal: TrainingGoal,
  exposures: ExerciseExposure[],
  capabilitiesByExerciseId: Record<string, ExerciseCapability>,
): GoalProgressSummary {
  const recentWindowStart =
    Date.now() - ADHERENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentExposures = exposures.filter(
    (exposure) =>
      exposure.startTime >= recentWindowStart &&
      capabilitiesByExerciseId[exposure.exerciseId]?.muscleGroup ===
        goal.muscle_group,
  );
  let hardSets = 0;
  let completedSets = 0;
  let hasMissingRir = false;

  for (const exposure of recentExposures) {
    for (const setItem of exposure.eligibleSets) {
      completedSets += 1;
      if (setItem.actualRir === null) {
        hasMissingRir = true;
        continue;
      }

      if ((setItem.actualRir ?? Number.POSITIVE_INFINITY) <= 4) {
        hardSets += 1;
      }
    }
  }

  const trackedSets = hardSets > 0 || !hasMissingRir ? hardSets : completedSets;
  const label = hardSets > 0 || !hasMissingRir ? 'hard sets' : 'completed sets';

  return {
    id: goal.id,
    title: 'Volume goal',
    progressText: `${trackedSets} ${label} toward ${goal.target_sets_per_week ?? 0} weekly sets.`,
    isComplete:
      goal.target_sets_per_week !== null &&
      trackedSets >= goal.target_sets_per_week,
    quality: {
      level: hasMissingRir ? 'medium' : 'high',
      reasons: hasMissingRir ? ['missing_rir'] : [],
    },
  };
}

export function buildGoalProgressSummaries(
  goals: TrainingGoal[],
  exposuresByExerciseId: Record<string, ExerciseExposure[]>,
  capabilitiesByExerciseId: Record<string, ExerciseCapability>,
): TrainingGoalViewModel[] {
  const allExposures = Object.values(exposuresByExerciseId).flat();
  const sessionsById = [
    ...new Map(
      allExposures.map((exposure) => [exposure.sessionId, exposure]),
    ).values(),
  ];

  return goals.map((goal) => {
    const progress =
      goal.goal_type === 'adherence'
        ? buildAdherenceGoalProgress(goal, sessionsById)
        : goal.goal_type === 'volume'
          ? buildVolumeGoalProgress(
              goal,
              allExposures,
              capabilitiesByExerciseId,
            )
          : buildStrengthGoalProgress(goal, exposuresByExerciseId);

    return {
      goal,
      title: formatGoalTitle(goal, capabilitiesByExerciseId),
      progress,
    };
  });
}
