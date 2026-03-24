/**
 * Active workout store.
 *
 * CALLING SPEC:
 * - keep transient active-workout state normalized for narrow subscriptions
 * - separate session meta, exercise order, exercise records, set records, and timers
 * - expose only pure selectors plus mutation actions; persistent writes stay outside
 * - side effects: none
 */

import { create } from 'zustand';

import {
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
} from '@shared/constants';
import { DEFAULT_EXERCISE_TIMER_SECONDS } from '@shared/utils';
import type {
  ActiveWorkoutExercise,
  ActiveWorkoutSession,
  ActiveWorkoutSessionMeta,
  ActiveWorkoutSet,
  ActiveWorkoutSummary,
  ActiveWorkoutOverview,
} from './types';

export { DEFAULT_EXERCISE_TIMER_SECONDS } from '@shared/utils';

interface ActiveWorkoutExerciseRecord extends Omit<
  ActiveWorkoutExercise,
  'sets'
> {
  setIds: string[];
}

interface WorkoutState {
  isWorkoutActive: boolean;
  isWorkoutCollapsed: boolean;
  activeSessionId: string | null;
  startTime: number | null;
  activeSessionMeta: ActiveWorkoutSessionMeta | null;
  activeExerciseOrder: string[];
  activeExercisesById: Record<string, ActiveWorkoutExerciseRecord>;
  activeSetsById: Record<string, ActiveWorkoutSet>;
  activeRouteSetIds: string[];
  activeSummary: ActiveWorkoutSummary;
  restTimerEndsAt: number | null;
  exerciseTimerEndsAtByExerciseId: Record<string, number | null>;
  exerciseTimerDurationByExerciseId: Record<string, number>;
}

interface WorkoutActions {
  startWorkout: (session: ActiveWorkoutSession) => void;
  collapseWorkout: () => void;
  expandWorkout: () => void;
  addExercise: (exercise: ActiveWorkoutExercise) => void;
  removeExercise: (exerciseId: string) => void;
  updateSet: (
    setId: string,
    changes: Partial<
      Pick<ActiveWorkoutSet, 'reps' | 'weight' | 'isCompleted' | 'actualRir'>
    >,
  ) => void;
  addSet: (exerciseId: string, newSet: ActiveWorkoutSet) => void;
  deleteSet: (setId: string) => void;
  startRestTimer: (durationSeconds?: number) => void;
  clearRestTimer: () => void;
  startExerciseTimer: (exerciseId: string, durationSeconds?: number) => void;
  clearExerciseTimer: (exerciseId: string) => void;
  setExerciseTimerDuration: (
    exerciseId: string,
    durationSeconds: number,
  ) => void;
  endWorkout: () => void;
}

export type WorkoutStore = WorkoutState & WorkoutActions;

const EMPTY_SUMMARY: ActiveWorkoutSummary = {
  exerciseCount: 0,
  completedExerciseCount: 0,
  setCount: 0,
  completedSetCount: 0,
  volume: 0,
};

const initialState: WorkoutState = {
  isWorkoutActive: false,
  isWorkoutCollapsed: false,
  activeSessionId: null,
  startTime: null,
  activeSessionMeta: null,
  activeExerciseOrder: [],
  activeExercisesById: {},
  activeSetsById: {},
  activeRouteSetIds: [],
  activeSummary: EMPTY_SUMMARY,
  restTimerEndsAt: null,
  exerciseTimerEndsAtByExerciseId: {},
  exerciseTimerDurationByExerciseId: {},
};

function buildSessionMeta(
  session: ActiveWorkoutSession,
): ActiveWorkoutSessionMeta {
  return {
    id: session.id,
    title: session.title,
    startTime: session.startTime,
    isFreeWorkout: session.isFreeWorkout,
  };
}

function buildExerciseRecord(
  exercise: ActiveWorkoutExercise,
): ActiveWorkoutExerciseRecord {
  const { sets, ...record } = exercise;

  return {
    ...record,
    setIds: sets.map((setItem) => setItem.id),
  };
}

function buildRouteSetIds(
  activeExerciseOrder: string[],
  activeExercisesById: Record<string, ActiveWorkoutExerciseRecord>,
): string[] {
  return activeExerciseOrder.flatMap(
    (exerciseId) => activeExercisesById[exerciseId]?.setIds ?? [],
  );
}

function buildSummary(
  activeExerciseOrder: string[],
  activeExercisesById: Record<string, ActiveWorkoutExerciseRecord>,
  activeSetsById: Record<string, ActiveWorkoutSet>,
  previousSummary: ActiveWorkoutSummary,
): ActiveWorkoutSummary {
  let completedExerciseCount = 0;
  let setCount = 0;
  let completedSetCount = 0;
  let volume = 0;

  activeExerciseOrder.forEach((exerciseId) => {
    const exercise = activeExercisesById[exerciseId];

    if (!exercise) {
      return;
    }

    setCount += exercise.setIds.length;
    let exerciseCompleted = exercise.setIds.length > 0;

    exercise.setIds.forEach((setId) => {
      const setItem = activeSetsById[setId];

      if (!setItem) {
        exerciseCompleted = false;
        return;
      }

      volume += setItem.weight * setItem.reps;

      if (setItem.isCompleted) {
        completedSetCount += 1;
      } else {
        exerciseCompleted = false;
      }
    });

    if (exerciseCompleted) {
      completedExerciseCount += 1;
    }
  });

  const nextSummary = {
    exerciseCount: activeExerciseOrder.length,
    completedExerciseCount,
    setCount,
    completedSetCount,
    volume,
  };

  if (
    previousSummary.exerciseCount === nextSummary.exerciseCount &&
    previousSummary.completedExerciseCount ===
      nextSummary.completedExerciseCount &&
    previousSummary.setCount === nextSummary.setCount &&
    previousSummary.completedSetCount === nextSummary.completedSetCount &&
    previousSummary.volume === nextSummary.volume
  ) {
    return previousSummary;
  }

  return nextSummary;
}

function buildSessionState(session: ActiveWorkoutSession): WorkoutState {
  const activeExerciseOrder = session.exercises.map(
    (exercise) => exercise.exerciseId,
  );
  const activeExercisesById: Record<string, ActiveWorkoutExerciseRecord> = {};
  const activeSetsById: Record<string, ActiveWorkoutSet> = {};

  session.exercises.forEach((exercise) => {
    activeExercisesById[exercise.exerciseId] = buildExerciseRecord(exercise);
    exercise.sets.forEach((setItem) => {
      activeSetsById[setItem.id] = setItem;
    });
  });

  const activeRouteSetIds = buildRouteSetIds(
    activeExerciseOrder,
    activeExercisesById,
  );

  return {
    isWorkoutActive: true,
    isWorkoutCollapsed: false,
    activeSessionId: session.id,
    startTime: session.startTime,
    activeSessionMeta: buildSessionMeta(session),
    activeExerciseOrder,
    activeExercisesById,
    activeSetsById,
    activeRouteSetIds,
    activeSummary: buildSummary(
      activeExerciseOrder,
      activeExercisesById,
      activeSetsById,
      EMPTY_SUMMARY,
    ),
    restTimerEndsAt: null,
    exerciseTimerEndsAtByExerciseId: Object.fromEntries(
      session.exercises.map((exercise) => [exercise.exerciseId, null]),
    ),
    exerciseTimerDurationByExerciseId: Object.fromEntries(
      session.exercises.map((exercise) => [
        exercise.exerciseId,
        exercise.restSeconds ?? DEFAULT_EXERCISE_TIMER_SECONDS,
      ]),
    ),
  };
}

function clampTimerDuration(durationSeconds: number, fallback: number): number {
  const normalizedDuration = Number.isFinite(durationSeconds)
    ? Math.round(durationSeconds)
    : fallback;

  return Math.min(
    MAX_REST_SECONDS,
    Math.max(MIN_REST_SECONDS, normalizedDuration),
  );
}

function omitKey<T extends Record<string, unknown>>(record: T, key: string): T {
  const nextRecord = { ...record };
  delete nextRecord[key];
  return nextRecord;
}

export function selectActiveWorkoutSnapshot(
  state: WorkoutState,
): ActiveWorkoutSession | null {
  if (state.activeSessionMeta === null) {
    return null;
  }

  const exercises: ActiveWorkoutSession['exercises'] = [];

  state.activeExerciseOrder.forEach((exerciseId) => {
    const exercise = state.activeExercisesById[exerciseId];

    if (!exercise) {
      return;
    }

    exercises.push({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      restSeconds: exercise.restSeconds,
      progressionPolicy: exercise.progressionPolicy,
      targetRir: exercise.targetRir,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      sets: exercise.setIds
        .map((setId) => state.activeSetsById[setId])
        .filter(
          (setItem): setItem is ActiveWorkoutSet => setItem !== undefined,
        ),
    });
  });

  return {
    ...state.activeSessionMeta,
    exercises,
  };
}

export function selectActiveWorkoutTitle(state: WorkoutState): string | null {
  return state.activeSessionMeta?.title ?? null;
}

export function selectActiveWorkoutExerciseCount(state: WorkoutState): number {
  return state.activeSummary.exerciseCount;
}

export function selectInitialFocusedSetId(state: WorkoutState): string | null {
  if (state.activeRouteSetIds.length === 0) {
    return null;
  }

  return (
    state.activeRouteSetIds.find(
      (setId) => state.activeSetsById[setId]?.isCompleted === false,
    ) ??
    state.activeRouteSetIds.at(-1) ??
    null
  );
}

export function selectNextFocusedSetId(
  state: WorkoutState,
  currentSetId: string,
): string | null {
  const currentIndex = state.activeRouteSetIds.indexOf(currentSetId);

  if (currentIndex < 0) {
    return currentSetId;
  }

  return state.activeRouteSetIds[currentIndex + 1] ?? currentSetId;
}

export function selectPreviousFocusedSetId(
  state: WorkoutState,
  currentSetId: string,
): string | null {
  const currentIndex = state.activeRouteSetIds.indexOf(currentSetId);

  if (currentIndex <= 0) {
    return null;
  }

  return state.activeRouteSetIds[currentIndex - 1] ?? null;
}

export function selectExerciseName(
  state: WorkoutState,
  exerciseId: string,
): string | null {
  return state.activeExercisesById[exerciseId]?.exerciseName ?? null;
}

export function selectExerciseIdsInSession(state: WorkoutState): string[] {
  return state.activeExerciseOrder;
}

export function selectOverview(state: WorkoutState): ActiveWorkoutOverview {
  const exercises: ActiveWorkoutOverview['exercises'] = [];

  state.activeExerciseOrder.forEach((exerciseId) => {
    const exercise = state.activeExercisesById[exerciseId];

    if (!exercise) {
      return;
    }

    exercises.push({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sets: exercise.setIds
        .map((setId, index) => {
          const setItem = state.activeSetsById[setId];

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
    summary: state.activeSummary,
    exercises,
  };
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  ...initialState,

  startWorkout: (session): void => {
    set(buildSessionState(session));
  },

  collapseWorkout: (): void => {
    set((state) =>
      state.isWorkoutActive ? { isWorkoutCollapsed: true } : state,
    );
  },

  expandWorkout: (): void => {
    set((state) =>
      state.isWorkoutActive ? { isWorkoutCollapsed: false } : state,
    );
  },

  addExercise: (exercise): void => {
    set((state) => {
      if (
        state.activeSessionMeta === null ||
        state.activeExercisesById[exercise.exerciseId]
      ) {
        return state;
      }

      const activeExerciseOrder = [
        ...state.activeExerciseOrder,
        exercise.exerciseId,
      ];
      const activeExercisesById = {
        ...state.activeExercisesById,
        [exercise.exerciseId]: buildExerciseRecord(exercise),
      };
      const activeSetsById = { ...state.activeSetsById };

      exercise.sets.forEach((setItem) => {
        activeSetsById[setItem.id] = setItem;
      });

      return {
        activeExerciseOrder,
        activeExercisesById,
        activeSetsById,
        activeRouteSetIds: buildRouteSetIds(
          activeExerciseOrder,
          activeExercisesById,
        ),
        activeSummary: buildSummary(
          activeExerciseOrder,
          activeExercisesById,
          activeSetsById,
          state.activeSummary,
        ),
        exerciseTimerEndsAtByExerciseId: {
          ...state.exerciseTimerEndsAtByExerciseId,
          [exercise.exerciseId]: null,
        },
        exerciseTimerDurationByExerciseId: {
          ...state.exerciseTimerDurationByExerciseId,
          [exercise.exerciseId]:
            exercise.restSeconds ?? DEFAULT_EXERCISE_TIMER_SECONDS,
        },
      };
    });
  },

  removeExercise: (exerciseId): void => {
    set((state) => {
      const exercise = state.activeExercisesById[exerciseId];

      if (state.activeSessionMeta === null || !exercise) {
        return state;
      }

      const activeExerciseOrder = state.activeExerciseOrder.filter(
        (candidateId) => candidateId !== exerciseId,
      );
      const activeExercisesById = omitKey(
        state.activeExercisesById,
        exerciseId,
      );
      const activeSetsById = { ...state.activeSetsById };
      exercise.setIds.forEach((setId) => {
        delete activeSetsById[setId];
      });

      return {
        activeExerciseOrder,
        activeExercisesById,
        activeSetsById,
        activeRouteSetIds: buildRouteSetIds(
          activeExerciseOrder,
          activeExercisesById,
        ),
        activeSummary: buildSummary(
          activeExerciseOrder,
          activeExercisesById,
          activeSetsById,
          state.activeSummary,
        ),
        exerciseTimerEndsAtByExerciseId: omitKey(
          state.exerciseTimerEndsAtByExerciseId,
          exerciseId,
        ),
        exerciseTimerDurationByExerciseId: omitKey(
          state.exerciseTimerDurationByExerciseId,
          exerciseId,
        ),
      };
    });
  },

  updateSet: (setId, changes): void => {
    set((state) => {
      const currentSet = state.activeSetsById[setId];

      if (state.activeSessionMeta === null || !currentSet) {
        return state;
      }

      const activeSetsById = {
        ...state.activeSetsById,
        [setId]: {
          ...currentSet,
          ...changes,
        },
      };

      return {
        activeSetsById,
        activeSummary: buildSummary(
          state.activeExerciseOrder,
          state.activeExercisesById,
          activeSetsById,
          state.activeSummary,
        ),
      };
    });
  },

  addSet: (exerciseId, newSet): void => {
    set((state) => {
      const exercise = state.activeExercisesById[exerciseId];

      if (state.activeSessionMeta === null || !exercise) {
        return state;
      }

      const activeExercisesById = {
        ...state.activeExercisesById,
        [exerciseId]: {
          ...exercise,
          setIds: [...exercise.setIds, newSet.id],
        },
      };
      const activeSetsById = {
        ...state.activeSetsById,
        [newSet.id]: newSet,
      };

      return {
        activeExercisesById,
        activeSetsById,
        activeRouteSetIds: buildRouteSetIds(
          state.activeExerciseOrder,
          activeExercisesById,
        ),
        activeSummary: buildSummary(
          state.activeExerciseOrder,
          activeExercisesById,
          activeSetsById,
          state.activeSummary,
        ),
      };
    });
  },

  deleteSet: (setId): void => {
    set((state) => {
      const setItem = state.activeSetsById[setId];

      if (state.activeSessionMeta === null || !setItem) {
        return state;
      }

      const exercise = state.activeExercisesById[setItem.exerciseId];

      if (!exercise) {
        return state;
      }

      const activeExercisesById = {
        ...state.activeExercisesById,
        [setItem.exerciseId]: {
          ...exercise,
          setIds: exercise.setIds.filter(
            (candidateId) => candidateId !== setId,
          ),
        },
      };
      const activeSetsById = omitKey(state.activeSetsById, setId);

      return {
        activeExercisesById,
        activeSetsById,
        activeRouteSetIds: buildRouteSetIds(
          state.activeExerciseOrder,
          activeExercisesById,
        ),
        activeSummary: buildSummary(
          state.activeExerciseOrder,
          activeExercisesById,
          activeSetsById,
          state.activeSummary,
        ),
      };
    });
  },

  startRestTimer: (durationSeconds = DEFAULT_REST_SECONDS): void => {
    set((state) => {
      if (!state.isWorkoutActive) {
        return state;
      }

      const clampedDuration = clampTimerDuration(
        durationSeconds,
        DEFAULT_REST_SECONDS,
      );

      return {
        restTimerEndsAt: Date.now() + clampedDuration * 1000,
      };
    });
  },

  clearRestTimer: (): void => {
    set({ restTimerEndsAt: null });
  },

  startExerciseTimer: (
    exerciseId,
    durationSeconds = DEFAULT_EXERCISE_TIMER_SECONDS,
  ): void => {
    set((state) => {
      if (!state.isWorkoutActive) {
        return state;
      }

      const clampedDuration = clampTimerDuration(
        durationSeconds,
        DEFAULT_EXERCISE_TIMER_SECONDS,
      );

      return {
        exerciseTimerEndsAtByExerciseId: {
          ...state.exerciseTimerEndsAtByExerciseId,
          [exerciseId]: Date.now() + clampedDuration * 1000,
        },
        exerciseTimerDurationByExerciseId: {
          ...state.exerciseTimerDurationByExerciseId,
          [exerciseId]:
            state.exerciseTimerDurationByExerciseId[exerciseId] ??
            clampedDuration,
        },
      };
    });
  },

  clearExerciseTimer: (exerciseId): void => {
    set((state) => ({
      exerciseTimerEndsAtByExerciseId: {
        ...state.exerciseTimerEndsAtByExerciseId,
        [exerciseId]: null,
      },
    }));
  },

  setExerciseTimerDuration: (exerciseId, durationSeconds): void => {
    set((state) => ({
      exerciseTimerDurationByExerciseId: {
        ...state.exerciseTimerDurationByExerciseId,
        [exerciseId]: clampTimerDuration(
          durationSeconds,
          DEFAULT_EXERCISE_TIMER_SECONDS,
        ),
      },
    }));
  },

  endWorkout: (): void => {
    set(initialState);
  },
}));
