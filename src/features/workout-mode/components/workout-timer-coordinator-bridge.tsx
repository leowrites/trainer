/**
 * Workout timer coordinator bridge.
 *
 * CALLING SPEC:
 * - subscribe to timer state separately from the active workout screen shell
 * - forward timer expiry cleanup into the timer coordinator hook
 * - render nothing
 * - side effects: timer cleanup only
 */

import { useShallow } from 'zustand/react/shallow';

import { useWorkoutTimerCoordinator } from '../hooks/use-workout-timer-coordinator';
import { useWorkoutStore } from '../store';

export function WorkoutTimerCoordinatorBridge({
  enabled,
}: {
  enabled: boolean;
}): null {
  const {
    restTimerEndsAt,
    clearRestTimer,
    exerciseTimerEndsAtByExerciseId,
    clearExerciseTimer,
  } = useWorkoutStore(
    useShallow((state) => ({
      restTimerEndsAt: state.restTimerEndsAt,
      clearRestTimer: state.clearRestTimer,
      exerciseTimerEndsAtByExerciseId: state.exerciseTimerEndsAtByExerciseId,
      clearExerciseTimer: state.clearExerciseTimer,
    })),
  );

  useWorkoutTimerCoordinator({
    enabled,
    restTimerEndsAt,
    clearRestTimer,
    exerciseTimerEndsAtByExerciseId,
    clearExerciseTimer,
  });

  return null;
}
