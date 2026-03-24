/**
 * Workout timer button label.
 *
 * CALLING SPEC:
 * - Renders the active rest/exercise timer label for one focused exercise.
 * - Owns only local countdown display state for the timer button.
 * - Has no persistence side effects.
 */

import React from 'react';

import { DEFAULT_EXERCISE_TIMER_SECONDS } from '../store';
import { useLiveSecond } from '../hooks/use-live-second';
import { formatRestCountdown, formatTimerDuration } from '../utils/formatters';

export function WorkoutTimerButtonLabel({
  restTimerEndsAt,
  exerciseTimerEndsAt,
  exerciseTimerDuration,
}: {
  restTimerEndsAt: number | null;
  exerciseTimerEndsAt: number | null;
  exerciseTimerDuration: number | null | undefined;
}): React.JSX.Element {
  const isRestTimerActive =
    restTimerEndsAt !== null && restTimerEndsAt > Date.now();
  const isExerciseTimerActive =
    exerciseTimerEndsAt !== null && exerciseTimerEndsAt > Date.now();
  const now = useLiveSecond(isRestTimerActive || isExerciseTimerActive);

  const label = isRestTimerActive
    ? `Rest ${formatRestCountdown((restTimerEndsAt ?? now) - now)}`
    : `Timer ${
        isExerciseTimerActive
          ? formatRestCountdown((exerciseTimerEndsAt ?? now) - now)
          : formatTimerDuration(
              exerciseTimerDuration ?? DEFAULT_EXERCISE_TIMER_SECONDS,
            )
      }`;

  return <>{label}</>;
}
