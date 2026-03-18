import { create } from 'zustand';

import { DEFAULT_REST_SECONDS } from '@shared/constants';
import type { ActiveWorkoutSession, ActiveWorkoutSet } from './types';

interface WorkoutState {
  /** Whether there is an active workout session in progress. */
  isWorkoutActive: boolean;
  /** Whether the active workout view is minimized into a floating launcher. */
  isWorkoutCollapsed: boolean;
  /** The database record ID of the active workout session, or null when idle. */
  activeSessionId: string | null;
  /** Unix timestamp (ms) when the current session was started, or null when idle. */
  startTime: number | null;
  /** In-memory representation of the active session. */
  activeSession: ActiveWorkoutSession | null;
  /** Timestamp when the current rest timer ends, or null when no timer is running. */
  restTimerEndsAt: number | null;
}

interface WorkoutActions {
  /** Begin a new workout session. */
  startWorkout: (session: ActiveWorkoutSession) => void;
  /** Minimize the active workout into a floating launcher. */
  collapseWorkout: () => void;
  /** Restore the active workout from its minimized launcher. */
  expandWorkout: () => void;
  /** Append a new exercise block to the active session. */
  addExercise: (exercise: ActiveWorkoutSession['exercises'][number]) => void;
  /** Remove an exercise block from the active session. */
  removeExercise: (exerciseId: string) => void;
  /** Update fields for a single set in the active session. */
  updateSet: (
    setId: string,
    changes: Partial<Pick<ActiveWorkoutSet, 'reps' | 'weight' | 'isCompleted'>>,
  ) => void;
  /** Append a new set to an existing exercise block. */
  addSet: (exerciseId: string, newSet: ActiveWorkoutSet) => void;
  /** Remove a set from the active session while preserving the exercise block. */
  deleteSet: (setId: string) => void;
  /** Start or restart the workout rest timer. */
  startRestTimer: (durationSeconds?: number) => void;
  /** Clear any running rest timer. */
  clearRestTimer: () => void;
  /** End the current workout session and reset all ephemeral state. */
  endWorkout: () => void;
}

type WorkoutStore = WorkoutState & WorkoutActions;

// ─── Initial state ─────────────────────────────────────────────────────────────

const initialState: WorkoutState = {
  isWorkoutActive: false,
  isWorkoutCollapsed: false,
  activeSessionId: null,
  startTime: null,
  activeSession: null,
  restTimerEndsAt: null,
};

// ─── Store ─────────────────────────────────────────────────────────────────────

/**
 * Ephemeral workout session state.
 *
 * This store tracks only transient, in-memory state for the active workout
 * session. Persistent data (sets, reps, weights) must be written to expo-sqlite.
 */
export const useWorkoutStore = create<WorkoutStore>((set) => ({
  ...initialState,

  startWorkout: (session: ActiveWorkoutSession): void => {
    set({
      isWorkoutActive: true,
      isWorkoutCollapsed: false,
      activeSessionId: session.id,
      startTime: session.startTime,
      activeSession: session,
      restTimerEndsAt: null,
    });
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
        !state.activeSession ||
        state.activeSession.exercises.some(
          (item) => item.exerciseId === exercise.exerciseId,
        )
      ) {
        return state;
      }

      return {
        activeSession: {
          ...state.activeSession,
          exercises: [...state.activeSession.exercises, exercise],
        },
      };
    });
  },

  removeExercise: (exerciseId): void => {
    set((state) => {
      if (!state.activeSession) {
        return state;
      }

      return {
        activeSession: {
          ...state.activeSession,
          exercises: state.activeSession.exercises.filter(
            (exercise) => exercise.exerciseId !== exerciseId,
          ),
        },
      };
    });
  },

  updateSet: (setId, changes): void => {
    set((state) => {
      if (!state.activeSession) {
        return state;
      }

      return {
        activeSession: {
          ...state.activeSession,
          exercises: state.activeSession.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((setItem) =>
              setItem.id === setId ? { ...setItem, ...changes } : setItem,
            ),
          })),
        },
      };
    });
  },

  addSet: (exerciseId, newSet): void => {
    set((state) => {
      if (!state.activeSession) {
        return state;
      }

      return {
        activeSession: {
          ...state.activeSession,
          exercises: state.activeSession.exercises.map((exercise) =>
            exercise.exerciseId === exerciseId
              ? { ...exercise, sets: [...exercise.sets, newSet] }
              : exercise,
          ),
        },
      };
    });
  },

  deleteSet: (setId): void => {
    set((state) => {
      if (!state.activeSession) {
        return state;
      }

      return {
        activeSession: {
          ...state.activeSession,
          exercises: state.activeSession.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.filter((setItem) => setItem.id !== setId),
          })),
        },
      };
    });
  },

  startRestTimer: (durationSeconds = DEFAULT_REST_SECONDS): void => {
    set((state) => {
      if (!state.isWorkoutActive) {
        return state;
      }

      return {
        restTimerEndsAt: Date.now() + durationSeconds * 1000,
      };
    });
  },

  clearRestTimer: (): void => {
    set({ restTimerEndsAt: null });
  },

  endWorkout: (): void => {
    set(initialState);
  },
}));
