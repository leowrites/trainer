/**
 * Active workout selector hooks.
 *
 * CALLING SPEC:
 * - expose narrow active-workout read hooks for screens, scenes, and overview UI
 * - keep timer reads, header reads, route reads, and overview reads isolated
 * - return stable references whenever unrelated workout state changes
 * - side effects: none
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import type {
  ActiveWorkoutOverview,
  ActiveWorkoutSessionMeta,
  ActiveWorkoutSet,
  ActiveWorkoutSummary,
} from '../types';
import {
  selectActiveWorkoutExerciseCount,
  selectActiveWorkoutTitle,
  selectExerciseIdsInSession,
  selectExerciseName,
  selectInitialFocusedSetId,
  selectNextFocusedSetId,
  selectPreviousFocusedSetId,
  type WorkoutStore,
  useWorkoutStore,
} from '../store';

export interface ActiveWorkoutHeaderState {
  title: string;
  totalExerciseCount: number;
  completedExerciseCount: number;
  startTime: number | null;
}

export interface ActiveWorkoutSetSceneState {
  exerciseId: string;
  exerciseName: string;
  set: ActiveWorkoutSet;
  setNumber: number;
  totalSetsForExercise: number;
  totalRemainingSets: number;
  previousSetId: string | null;
  nextSetId: string | null;
}

interface ActiveWorkoutOverviewSource {
  activeSummary: ActiveWorkoutSummary;
  activeExerciseOrder: string[];
  activeExercisesById: WorkoutStore['activeExercisesById'];
  activeSetsById: WorkoutStore['activeSetsById'];
}

function buildSetSceneState(
  state: WorkoutStore,
  setId: string,
): ActiveWorkoutSetSceneState | null {
  const set = state.activeSetsById[setId];

  if (!set) {
    return null;
  }

  const exercise = state.activeExercisesById[set.exerciseId];

  if (!exercise) {
    return null;
  }

  const setNumber = exercise.setIds.indexOf(setId) + 1;
  const totalRemainingSets =
    state.activeSummary.setCount -
    state.activeSummary.completedSetCount -
    (set.isCompleted ? 0 : 1);

  return {
    exerciseId: set.exerciseId,
    exerciseName: exercise.exerciseName,
    set,
    setNumber,
    totalSetsForExercise: exercise.setIds.length,
    totalRemainingSets,
    previousSetId: selectPreviousFocusedSetId(state, setId),
    nextSetId: selectNextFocusedSetId(state, setId),
  };
}

function buildOverviewFromSource(
  source: ActiveWorkoutOverviewSource,
): ActiveWorkoutOverview {
  const exercises: ActiveWorkoutOverview['exercises'] = [];

  source.activeExerciseOrder.forEach((exerciseId) => {
    const exercise = source.activeExercisesById[exerciseId];

    if (!exercise) {
      return;
    }

    exercises.push({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sets: exercise.setIds
        .map((setId, index) => {
          const setItem = source.activeSetsById[setId];

          if (!setItem) {
            return null;
          }

          return {
            setId,
            setLabel: `Set ${index + 1}`,
            reps: setItem.reps,
            weight: setItem.weight,
            isCompleted: setItem.isCompleted,
          };
        })
        .filter(
          (setItem): setItem is NonNullable<typeof setItem> => setItem !== null,
        ),
    });
  });

  return {
    summary: source.activeSummary,
    exercises,
  };
}

export function useActiveWorkoutVisibility(): {
  isWorkoutActive: boolean;
  isWorkoutCollapsed: boolean;
} {
  return useWorkoutStore(
    useShallow((state) => ({
      isWorkoutActive: state.isWorkoutActive,
      isWorkoutCollapsed: state.isWorkoutCollapsed,
    })),
  );
}

export function useActiveWorkoutSessionMeta(): ActiveWorkoutSessionMeta | null {
  return useWorkoutStore((state) => state.activeSessionMeta);
}

export function useActiveWorkoutHeaderState(): ActiveWorkoutHeaderState {
  return useWorkoutStore(
    useShallow((state) => ({
      title: selectActiveWorkoutTitle(state) ?? 'Workout',
      totalExerciseCount: selectActiveWorkoutExerciseCount(state),
      completedExerciseCount: state.activeSummary.completedExerciseCount,
      startTime: state.startTime,
    })),
  );
}

export function useActiveWorkoutSummary(): ActiveWorkoutSummary {
  return useWorkoutStore((state) => state.activeSummary);
}

export function useActiveWorkoutSetIds(): string[] {
  return useWorkoutStore((state) => state.activeRouteSetIds);
}

export function useActiveWorkoutInitialFocusedSetId(): string | null {
  return useWorkoutStore(selectInitialFocusedSetId);
}

export function useActiveWorkoutExerciseIds(): string[] {
  return useWorkoutStore(selectExerciseIdsInSession);
}

export function useActiveWorkoutExerciseName(
  exerciseId: string,
): string | null {
  return useWorkoutStore((state) => selectExerciseName(state, exerciseId));
}

export function useActiveWorkoutSetSceneState(
  setId: string,
): ActiveWorkoutSetSceneState | null {
  return useWorkoutStore(
    useShallow((state) => buildSetSceneState(state, setId)),
  );
}

export function useActiveWorkoutSetExerciseId(setId: string): string | null {
  return useWorkoutStore(
    (state) => state.activeSetsById[setId]?.exerciseId ?? null,
  );
}

export function useActiveWorkoutOverview(
  enabled: boolean,
): ActiveWorkoutOverview | null {
  const overviewSource = useWorkoutStore(
    useShallow((state) =>
      enabled
        ? {
            activeSummary: state.activeSummary,
            activeExerciseOrder: state.activeExerciseOrder,
            activeExercisesById: state.activeExercisesById,
            activeSetsById: state.activeSetsById,
          }
        : null,
    ),
  );

  return useMemo(() => {
    if (overviewSource === null) {
      return null;
    }

    return buildOverviewFromSource(overviewSource);
  }, [overviewSource]);
}

export function useExerciseTimerState(exerciseId: string): {
  restTimerEndsAt: number | null;
  exerciseTimerEndsAt: number | null;
  exerciseTimerDuration: number;
} {
  return useWorkoutStore(
    useShallow((state) => ({
      restTimerEndsAt: state.restTimerEndsAt,
      exerciseTimerEndsAt:
        state.exerciseTimerEndsAtByExerciseId[exerciseId] ?? null,
      exerciseTimerDuration:
        state.exerciseTimerDurationByExerciseId[exerciseId] ?? 60,
    })),
  );
}
