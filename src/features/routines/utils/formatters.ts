/**
 * Routine formatting and draft helpers.
 *
 * CALLING SPEC:
 * - Date/volume helpers format routine detail analytics labels.
 * - Draft builders and parsers convert nested template data between UI strings
 *   and the strongly typed routine template contracts.
 */

import { generateId } from '@core/database';
import type { RoutineExercise } from '@core/database/types';
import type {
  NewRoutineInput,
  RoutineExerciseTemplate,
} from '../template-types';
import type { RoutineExerciseDraft, RoutineSetDraft } from '../types';

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

export function parsePositiveWholeNumber(
  value: string,
  fallback: number,
): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseOptionalWeight(value: string): number | null {
  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return null;
  }

  const parsed = Number.parseFloat(trimmedValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function buildDefaultRoutineSetDraft(): RoutineSetDraft {
  return {
    id: generateId(),
    targetReps: '10',
    plannedWeight: '',
  };
}

function isRoutineExerciseTemplate(
  entry: RoutineExercise | RoutineExerciseTemplate,
): entry is RoutineExerciseTemplate {
  return 'exerciseId' in entry;
}

export function buildRoutineExerciseDrafts(
  routineExercises: Array<RoutineExerciseTemplate | RoutineExercise>,
): RoutineExerciseDraft[] {
  return routineExercises.map((entry) => ({
    exerciseId: isRoutineExerciseTemplate(entry)
      ? entry.exerciseId
      : entry.exercise_id,
    restSeconds:
      (isRoutineExerciseTemplate(entry)
        ? entry.restSeconds
        : entry.rest_seconds) === null ||
      (isRoutineExerciseTemplate(entry)
        ? entry.restSeconds
        : entry.rest_seconds) === undefined
        ? ''
        : String(
            isRoutineExerciseTemplate(entry)
              ? entry.restSeconds
              : entry.rest_seconds,
          ),
    sets:
      isRoutineExerciseTemplate(entry) && entry.sets.length > 0
        ? entry.sets.map((setEntry) => ({
            id: setEntry.id,
            targetReps: String(setEntry.targetReps),
            plannedWeight:
              setEntry.plannedWeight === null
                ? ''
                : String(setEntry.plannedWeight),
          }))
        : Array.from(
            {
              length: Math.max(
                1,
                isRoutineExerciseTemplate(entry)
                  ? entry.targetSets
                  : entry.target_sets,
              ),
            },
            (_, index) => ({
              id: `${entry.id}-${index}`,
              targetReps: String(
                isRoutineExerciseTemplate(entry)
                  ? (entry.targetReps ?? 1)
                  : entry.target_reps,
              ),
              plannedWeight: '',
            }),
          ),
  }));
}

export function buildDefaultRoutineExerciseDraft(
  exerciseId: string,
): RoutineExerciseDraft {
  return {
    exerciseId,
    restSeconds: '',
    sets: [buildDefaultRoutineSetDraft()],
  };
}

export function buildRoutineInput(
  name: string,
  exerciseDrafts: RoutineExerciseDraft[],
): NewRoutineInput {
  return {
    name: name.trim(),
    exercises: exerciseDrafts.map((entry) => ({
      exerciseId: entry.exerciseId,
      restSeconds:
        entry.restSeconds.trim() === ''
          ? null
          : parsePositiveWholeNumber(entry.restSeconds, 60),
      sets: entry.sets.map((setEntry) => ({
        targetReps: parsePositiveWholeNumber(setEntry.targetReps, 1),
        plannedWeight: parseOptionalWeight(setEntry.plannedWeight),
      })),
    })),
  };
}
