import type { RoutineExercise } from '@core/database/types';
import type { RoutineExerciseDraft } from '../types';

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDateLabel(timestamp: number | null): string {
  if (timestamp === null) {
    return 'Not yet';
  }

  return shortDateFormatter.format(timestamp);
}

export function formatDurationLabel(durationMinutes: number | null): string {
  if (durationMinutes === null) {
    return 'No completed sessions yet';
  }

  return `${Math.round(durationMinutes)} min avg`;
}

export function formatVolumeLabel(value: number | null): string {
  if (value === null) {
    return 'No volume yet';
  }

  return `${Math.round(value)} avg volume`;
}

export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

export function parsePositiveWholeNumber(
  value: string,
  fallback: number,
): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildRoutineExerciseDrafts(
  routineExercises: RoutineExercise[],
): RoutineExerciseDraft[] {
  return routineExercises.map((entry) => ({
    exerciseId: entry.exercise_id,
    targetSets: String(entry.target_sets),
    targetReps: String(entry.target_reps),
  }));
}
