import type {
  ActiveWorkoutSession,
  PreviousExercisePerformance,
} from '../types';

export function parseWholeNumber(value: string): number {
  if (value.trim() === '') {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function parseDecimalNumber(value: string): number {
  if (value.trim() === '') {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatElapsedDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  return `${minutes}m`;
}

export function formatRestCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const SWIPE_ACTION_WIDTH = 72;
export const EXERCISE_TIMER_OPTIONS = [30, 60, 90, 120] as const;

export function formatShortDate(timestamp: number | null): string {
  if (timestamp === null) {
    return 'No workouts yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
}

export function formatTimerDuration(seconds: number): string {
  return formatRestCountdown(seconds * 1000);
}

export function formatPreviousPerformance(
  performance: PreviousExercisePerformance | null,
): string {
  if (!performance) {
    return 'No previous logged set';
  }

  return `Previous ${performance.reps} x ${performance.weight}`;
}

export function countCompletedExercises(
  exercises: ActiveWorkoutSession['exercises'],
): number {
  return exercises.filter(
    (exercise) =>
      exercise.sets.length > 0 &&
      exercise.sets.every((setItem) => setItem.isCompleted),
  ).length;
}

export function isExerciseDetailNavigationAction(action: unknown): boolean {
  if (
    typeof action !== 'object' ||
    action === null ||
    !('type' in action) ||
    !('payload' in action)
  ) {
    return false;
  }

  const typedAction = action as {
    type?: string;
    payload?: { name?: string };
  };

  return (
    typedAction.type === 'NAVIGATE' &&
    typedAction.payload?.name === 'ExerciseDetail'
  );
}

export function getGreeting(
  displayName: string | null,
  now: number,
): {
  title: string;
  subtitle: string;
} {
  const hour = new Date(now).getHours();
  const name = displayName?.trim() ?? '';
  const suffix = name === '' ? '' : `, ${name}`;

  if (hour < 12) {
    return {
      title: `Good morning${suffix}`,
      subtitle: 'Set the tone early and get the next session moving.',
    };
  }

  if (hour < 18) {
    return {
      title: `Welcome back${suffix}`,
      subtitle: 'Your training week is in motion. Pick up where you left off.',
    };
  }

  return {
    title: `Good evening${suffix}`,
    subtitle: 'Close the day with a session review or one more workout.',
  };
}
