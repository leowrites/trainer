import { create } from 'zustand';

import type { ActiveWorkoutSession, ActiveWorkoutSet } from './types';

interface WorkoutState {
  /** Whether there is an active workout session in progress. */
  isWorkoutActive: boolean;
  /** The database record ID of the active workout session, or null when idle. */
  activeSessionId: string | null;
  /** Unix timestamp (ms) when the current session was started, or null when idle. */
  startTime: number | null;
  /** In-memory representation of the active session. */
  activeSession: ActiveWorkoutSession | null;
}

interface WorkoutActions {
  /** Begin a new workout session. */
  startWorkout: (session: ActiveWorkoutSession) => void;
  /** Update fields for a single set in the active session. */
  updateSet: (
    setId: string,
    changes: Partial<Pick<ActiveWorkoutSet, 'reps' | 'weight' | 'isCompleted'>>,
  ) => void;
  /** Append a new set to an existing exercise block. */
  addSet: (exerciseId: string, newSet: ActiveWorkoutSet) => void;
  /** Remove a set from the active session while preserving the exercise block. */
  deleteSet: (setId: string) => void;
  /** End the current workout session and reset all ephemeral state. */
  endWorkout: () => void;
}

type WorkoutStore = WorkoutState & WorkoutActions;

// ─── Initial state ─────────────────────────────────────────────────────────────

const initialState: WorkoutState = {
  isWorkoutActive: false,
  activeSessionId: null,
  startTime: null,
  activeSession: null,
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
      activeSessionId: session.id,
      startTime: session.startTime,
      activeSession: session,
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

  endWorkout: (): void => {
    set(initialState);
  },
}));
