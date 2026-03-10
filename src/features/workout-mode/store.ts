import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WorkoutState {
  /** Whether there is an active workout session in progress. */
  isWorkoutActive: boolean;
  /** The database record ID of the active workout session, or null when idle. */
  activeSessionId: string | null;
  /** Unix timestamp (ms) when the current session was started, or null when idle. */
  startTime: number | null;
}

interface WorkoutActions {
  /** Begin a new workout session. */
  startWorkout: (sessionId: string) => void;
  /** End the current workout session and reset all ephemeral state. */
  endWorkout: () => void;
}

type WorkoutStore = WorkoutState & WorkoutActions;

// ─── Initial state ─────────────────────────────────────────────────────────────

const initialState: WorkoutState = {
  isWorkoutActive: false,
  activeSessionId: null,
  startTime: null,
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

  startWorkout: (sessionId: string): void => {
    set({
      isWorkoutActive: true,
      activeSessionId: sessionId,
      startTime: Date.now(),
    });
  },

  endWorkout: (): void => {
    set(initialState);
  },
}));
