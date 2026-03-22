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
import { DEFAULT_EXERCISE_TIMER_SECONDS } from '@shared/utils';
import type {
  NewRoutineInput,
  ProgressionPolicy,
  RoutineExerciseTemplate,
  RoutineSetRole,
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
    targetRepsMin: '10',
    targetRepsMax: '10',
    plannedWeight: '',
    setRole: 'work',
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
    progressionPolicy: isRoutineExerciseTemplate(entry)
      ? entry.progressionPolicy
      : (entry.progression_policy ?? 'double_progression'),
    targetRir:
      (isRoutineExerciseTemplate(entry)
        ? entry.targetRir
        : entry.target_rir) === null ||
      (isRoutineExerciseTemplate(entry)
        ? entry.targetRir
        : entry.target_rir) === undefined
        ? ''
        : String(
            isRoutineExerciseTemplate(entry)
              ? entry.targetRir
              : entry.target_rir,
          ),
    sets:
      isRoutineExerciseTemplate(entry) && entry.sets.length > 0
        ? entry.sets.map((setEntry) => ({
            id: setEntry.id,
            targetRepsMin: String(setEntry.targetRepsMin),
            targetRepsMax: String(setEntry.targetRepsMax),
            plannedWeight:
              setEntry.plannedWeight === null
                ? ''
                : String(setEntry.plannedWeight),
            setRole: setEntry.setRole,
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
              targetRepsMin: String(
                isRoutineExerciseTemplate(entry)
                  ? (entry.targetRepsMin ?? 1)
                  : entry.target_reps,
              ),
              targetRepsMax: String(
                isRoutineExerciseTemplate(entry)
                  ? (entry.targetRepsMax ?? 1)
                  : entry.target_reps,
              ),
              plannedWeight: '',
              setRole:
                (isRoutineExerciseTemplate(entry)
                  ? entry.progressionPolicy
                  : entry.progression_policy) === 'top_set_backoff'
                  ? index === 0
                    ? 'top_set'
                    : 'backoff'
                  : 'work',
            }),
          ),
  }));
}

export function buildDefaultRoutineExerciseDraft(
  exerciseId: string,
  progressionPolicy: ProgressionPolicy = 'double_progression',
): RoutineExerciseDraft {
  return {
    exerciseId,
    restSeconds: '',
    progressionPolicy,
    targetRir: '',
    sets: [buildDefaultRoutineSetDraft()],
  };
}

function parseOptionalNumber(value: string): number | null {
  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return null;
  }

  const parsed = Number.parseFloat(trimmedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRange(
  minValue: string,
  maxValue: string,
): Pick<
  RoutineExerciseTemplate['sets'][number],
  'targetRepsMin' | 'targetRepsMax'
> {
  const parsedMin = parsePositiveWholeNumber(minValue, 1);
  const parsedMax = parsePositiveWholeNumber(maxValue, parsedMin);

  return {
    targetRepsMin: Math.min(parsedMin, parsedMax),
    targetRepsMax: Math.max(parsedMin, parsedMax),
  };
}

function normalizeSetRole(
  progressionPolicy: ProgressionPolicy,
  setRole: RoutineSetRole,
  index: number,
): RoutineSetRole {
  if (progressionPolicy === 'top_set_backoff') {
    if (setRole === 'warmup' || setRole === 'optional') {
      return setRole;
    }

    return index === 0 ? 'top_set' : 'backoff';
  }

  return setRole === 'warmup' || setRole === 'optional' ? setRole : 'work';
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
          : parsePositiveWholeNumber(
              entry.restSeconds,
              DEFAULT_EXERCISE_TIMER_SECONDS,
            ),
      progressionPolicy: entry.progressionPolicy,
      targetRir: parseOptionalNumber(entry.targetRir),
      sets: entry.sets.map((setEntry) => ({
        ...normalizeRange(setEntry.targetRepsMin, setEntry.targetRepsMax),
        plannedWeight: parseOptionalWeight(setEntry.plannedWeight),
        setRole: normalizeSetRole(
          entry.progressionPolicy,
          setEntry.setRole,
          entry.sets.indexOf(setEntry),
        ),
      })),
    })),
  };
}
