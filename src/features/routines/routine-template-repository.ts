/**
 * Routine template repository.
 *
 * CALLING SPEC:
 * - `loadRoutineExerciseTemplates(db, routineId)` returns the nested template
 *   model for one routine, sorted by exercise and set position.
 * - `insertRoutineExerciseTemplates(db, routineId, exercises)` writes one full
 *   routine template into the current transaction.
 * - `replaceRoutineExerciseTemplates(db, routineId, exercises)` deletes the
 *   existing template rows and writes the provided replacement.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { RoutineExercise, RoutineExerciseSet } from '@core/database/types';
import { generateId } from '@core/database/utils';
import type {
  RoutineExerciseInput,
  RoutineExerciseSetInput,
  RoutineExerciseTemplate,
  RoutineExerciseTemplateSet,
} from './template-types';

function buildTargetSummary(
  sets: RoutineExerciseSetInput[],
): Pick<RoutineExercise, 'target_sets' | 'target_reps'> {
  return {
    target_sets: sets.length,
    target_reps: sets[0]?.targetRepsMin ?? 0,
  };
}

function normalizeInputSets(
  exercise: RoutineExerciseInput,
): RoutineExerciseSetInput[] {
  if (exercise.sets && exercise.sets.length > 0) {
    return exercise.sets;
  }

  const normalizedTargetSets =
    typeof exercise.targetSets === 'number' && exercise.targetSets > 0
      ? exercise.targetSets
      : 1;

  return Array.from({ length: normalizedTargetSets }, () => ({
    targetReps: exercise.targetReps ?? exercise.targetRepsMin ?? 1,
    targetRepsMin: exercise.targetRepsMin ?? exercise.targetReps ?? 1,
    targetRepsMax:
      exercise.targetRepsMax ??
      exercise.targetRepsMin ??
      exercise.targetReps ??
      1,
    plannedWeight: null,
    setRole:
      exercise.progressionPolicy === 'top_set_backoff' ? 'backoff' : 'work',
  }));
}

export function loadRoutineExerciseTemplates(
  db: Pick<SQLiteDatabase, 'getAllSync'>,
  routineId: string,
): RoutineExerciseTemplate[] {
  const exerciseRows = db.getAllSync<RoutineExercise>(
    `SELECT id, routine_id, exercise_id, position, target_sets, target_reps, rest_seconds, progression_policy, target_rir
     FROM routine_exercises
     WHERE routine_id = ?
     ORDER BY position ASC`,
    [routineId],
  );

  if (exerciseRows.length === 0) {
    return [];
  }

  const setRows = db.getAllSync<RoutineExerciseSet>(
    `SELECT id, routine_exercise_id, position, target_reps, planned_weight, target_reps_min, target_reps_max, set_role
     FROM routine_exercise_sets
     WHERE routine_exercise_id IN (${exerciseRows.map(() => '?').join(', ')})
     ORDER BY position ASC`,
    exerciseRows.map((row) => row.id),
  );

  const setsByExerciseId = new Map<string, RoutineExerciseTemplateSet[]>();

  for (const setRow of setRows) {
    const sets = setsByExerciseId.get(setRow.routine_exercise_id) ?? [];
    sets.push({
      id: setRow.id,
      position: setRow.position,
      targetReps: setRow.target_reps,
      targetRepsMin: setRow.target_reps_min ?? setRow.target_reps,
      targetRepsMax:
        setRow.target_reps_max ?? setRow.target_reps_min ?? setRow.target_reps,
      plannedWeight: setRow.planned_weight,
      setRole: setRow.set_role ?? 'work',
    });
    setsByExerciseId.set(setRow.routine_exercise_id, sets);
  }

  return exerciseRows.map((exerciseRow) => {
    const sets =
      setsByExerciseId.get(exerciseRow.id) ??
      Array.from(
        { length: Math.max(0, exerciseRow.target_sets) },
        (_, index) => ({
          id: `${exerciseRow.id}-legacy-${index}`,
          position: index,
          targetReps: exerciseRow.target_reps,
          targetRepsMin: exerciseRow.target_reps,
          targetRepsMax: exerciseRow.target_reps,
          plannedWeight: null,
          setRole:
            exerciseRow.progression_policy === 'top_set_backoff'
              ? index === 0
                ? 'top_set'
                : 'backoff'
              : 'work',
        }),
      );

    return {
      id: exerciseRow.id,
      exerciseId: exerciseRow.exercise_id,
      position: exerciseRow.position,
      restSeconds: exerciseRow.rest_seconds ?? null,
      progressionPolicy: exerciseRow.progression_policy ?? 'double_progression',
      targetRir: exerciseRow.target_rir ?? null,
      targetSets: sets.length,
      targetReps: sets[0]?.targetRepsMin ?? null,
      targetRepsMin: sets[0]?.targetRepsMin ?? null,
      targetRepsMax: sets[0]?.targetRepsMax ?? null,
      sets,
    };
  });
}

export function insertRoutineExerciseTemplates(
  db: Pick<SQLiteDatabase, 'runSync'>,
  routineId: string,
  exercises: RoutineExerciseInput[],
): void {
  exercises.forEach((exercise, exercisePosition) => {
    const routineExerciseId = generateId();
    const sets = normalizeInputSets(exercise);
    const targetSummary = buildTargetSummary(sets);

    db.runSync(
      `INSERT INTO routine_exercises (
        id,
        routine_id,
        exercise_id,
        position,
        target_sets,
        target_reps,
        rest_seconds,
        progression_policy,
        target_rir
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routineExerciseId,
        routineId,
        exercise.exerciseId,
        exercisePosition,
        targetSummary.target_sets,
        targetSummary.target_reps,
        exercise.restSeconds ?? null,
        exercise.progressionPolicy ?? 'double_progression',
        exercise.targetRir ?? null,
      ],
    );

    sets.forEach((setEntry, setPosition) => {
      db.runSync(
        `INSERT INTO routine_exercise_sets (
          id,
          routine_exercise_id,
          position,
          target_reps,
          planned_weight,
          target_reps_min,
          target_reps_max,
          set_role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          routineExerciseId,
          setPosition,
          setEntry.targetRepsMin,
          setEntry.plannedWeight,
          setEntry.targetRepsMin,
          setEntry.targetRepsMax,
          setEntry.setRole ??
            (exercise.progressionPolicy === 'top_set_backoff'
              ? setPosition === 0
                ? 'top_set'
                : 'backoff'
              : 'work'),
        ],
      );
    });
  });
}

export function replaceRoutineExerciseTemplates(
  db: Pick<SQLiteDatabase, 'runSync'>,
  routineId: string,
  exercises: RoutineExerciseInput[],
): void {
  db.runSync(
    `DELETE FROM routine_exercise_sets
     WHERE routine_exercise_id IN (
       SELECT id
       FROM routine_exercises
       WHERE routine_id = ?
     )`,
    [routineId],
  );
  db.runSync('DELETE FROM routine_exercises WHERE routine_id = ?', [routineId]);
  insertRoutineExerciseTemplates(db, routineId, exercises);
}
