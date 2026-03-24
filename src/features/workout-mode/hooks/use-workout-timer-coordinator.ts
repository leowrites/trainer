/**
 * Workout timer coordinator hook.
 *
 * CALLING SPEC:
 * - `useWorkoutTimerCoordinator(...)` clears expired rest and exercise timers.
 * - Owns timer-expiry cleanup only; it does not expose display state.
 * - Side effects: registers and clears one interval while the workout is active.
 */

import { useEffect } from 'react';

interface UseWorkoutTimerCoordinatorOptions {
  enabled: boolean;
  restTimerEndsAt: number | null;
  clearRestTimer: () => void;
  exerciseTimerEndsAtByExerciseId: Record<string, number | null>;
  clearExerciseTimer: (exerciseId: string) => void;
}

export function useWorkoutTimerCoordinator({
  enabled,
  restTimerEndsAt,
  clearRestTimer,
  exerciseTimerEndsAtByExerciseId,
  clearExerciseTimer,
}: UseWorkoutTimerCoordinatorOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const clearExpiredTimers = (): void => {
      const now = Date.now();

      if (restTimerEndsAt !== null && restTimerEndsAt <= now) {
        clearRestTimer();
      }

      for (const [exerciseId, endsAt] of Object.entries(
        exerciseTimerEndsAtByExerciseId,
      )) {
        if (endsAt !== null && endsAt <= now) {
          clearExerciseTimer(exerciseId);
        }
      }
    };

    clearExpiredTimers();
    const intervalId = setInterval(clearExpiredTimers, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    clearExerciseTimer,
    clearRestTimer,
    enabled,
    exerciseTimerEndsAtByExerciseId,
    restTimerEndsAt,
  ]);
}
