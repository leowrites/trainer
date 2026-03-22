/**
 * Workout template update repository.
 *
 * CALLING SPEC:
 * - `loadWorkoutTemplateUpdateState(db, sessionId)` reports whether the
 *   completed session can be applied back to its routine template.
 * - `applyWorkoutTemplateUpdate(db, sessionId)` rewrites the routine template
 *   to exactly match the finished session and marks the session as applied.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { replaceRoutineExerciseTemplates } from '@features/routines/template-api';
import type { RoutineExerciseInput } from '@features/routines/template-api';

type WorkoutTemplateDatabase = Pick<SQLiteDatabase, 'runSync'> &
  Partial<
    Pick<SQLiteDatabase, 'getAllSync' | 'getFirstSync' | 'withTransactionSync'>
  >;

interface WorkoutTemplateUpdateSessionRow {
  id: string;
  routine_id: string | null;
  snapshot_name: string | null;
  template_applied_at: number | null;
  routine_name: string | null;
}

interface WorkoutTemplateUpdateExerciseRow {
  exercise_id: string;
  position: number;
  rest_seconds: number | null;
}

interface WorkoutTemplateUpdateSetRow {
  exercise_id: string;
  position: number | null;
  reps: number;
  weight: number;
}

export interface WorkoutTemplateUpdateState {
  routineName: string;
  canApply: boolean;
  appliedAt: number | null;
}

function mergeExerciseRows(
  exerciseRows: WorkoutTemplateUpdateExerciseRow[],
  fallbackExerciseRows: WorkoutTemplateUpdateExerciseRow[],
): WorkoutTemplateUpdateExerciseRow[] {
  if (exerciseRows.length === 0) {
    return fallbackExerciseRows;
  }

  const rowsByExerciseId = new Map(
    exerciseRows.map((row) => [row.exercise_id, row]),
  );

  for (const fallbackRow of fallbackExerciseRows) {
    if (!rowsByExerciseId.has(fallbackRow.exercise_id)) {
      rowsByExerciseId.set(fallbackRow.exercise_id, fallbackRow);
    }
  }

  return [...rowsByExerciseId.values()].sort(
    (left, right) => left.position - right.position,
  );
}

function buildFallbackExerciseRows(
  db: WorkoutTemplateDatabase,
  sessionId: string,
): WorkoutTemplateUpdateExerciseRow[] {
  if (!db.getAllSync) {
    return [];
  }

  return db.getAllSync<WorkoutTemplateUpdateExerciseRow>(
    `SELECT exercise_id, MIN(COALESCE(position, rowid - 1)) AS position, NULL AS rest_seconds
     FROM workout_sets
     WHERE session_id = ?
     GROUP BY exercise_id
     ORDER BY position ASC`,
    [sessionId],
  );
}

function loadSessionRow(
  db: WorkoutTemplateDatabase,
  sessionId: string,
): WorkoutTemplateUpdateSessionRow | null {
  if (!db.getFirstSync) {
    return null;
  }

  return db.getFirstSync<WorkoutTemplateUpdateSessionRow>(
    `SELECT ws.id, ws.routine_id, ws.snapshot_name, ws.template_applied_at, r.name AS routine_name
     FROM workout_sessions ws
     LEFT JOIN routines r ON r.id = ws.routine_id AND r.is_deleted = 0
     WHERE ws.id = ?
     LIMIT 1`,
    [sessionId],
  );
}

export function loadWorkoutTemplateUpdateState(
  db: WorkoutTemplateDatabase,
  sessionId: string,
): WorkoutTemplateUpdateState | null {
  const sessionRow = loadSessionRow(db, sessionId);

  if (!sessionRow?.routine_id || !sessionRow.routine_name) {
    return null;
  }

  return {
    routineName:
      sessionRow.routine_name ?? sessionRow.snapshot_name ?? 'Routine',
    canApply: sessionRow.template_applied_at === null,
    appliedAt: sessionRow.template_applied_at,
  };
}

function buildRoutineExerciseInputs(
  exerciseRows: WorkoutTemplateUpdateExerciseRow[],
  setRows: WorkoutTemplateUpdateSetRow[],
): RoutineExerciseInput[] {
  return exerciseRows
    .map((exerciseRow) => ({
      exerciseId: exerciseRow.exercise_id,
      restSeconds: exerciseRow.rest_seconds,
      sets: setRows
        .filter((setRow) => setRow.exercise_id === exerciseRow.exercise_id)
        .sort(
          (left, right) =>
            (left.position ?? Number.MAX_SAFE_INTEGER) -
            (right.position ?? Number.MAX_SAFE_INTEGER),
        )
        .map((setRow) => ({
          targetReps: setRow.reps,
          targetRepsMin: setRow.reps,
          targetRepsMax: setRow.reps,
          plannedWeight: setRow.weight,
        })),
    }))
    .filter((exerciseRow) => exerciseRow.sets && exerciseRow.sets.length > 0);
}

export function applyWorkoutTemplateUpdate(
  db: WorkoutTemplateDatabase,
  sessionId: string,
): WorkoutTemplateUpdateState | null {
  if (!db.getAllSync || !db.withTransactionSync) {
    return null;
  }

  const sessionRow = loadSessionRow(db, sessionId);

  if (
    !sessionRow?.routine_id ||
    !sessionRow.routine_name ||
    sessionRow.template_applied_at !== null
  ) {
    return null;
  }

  const exerciseRows =
    db.getAllSync<WorkoutTemplateUpdateExerciseRow>(
      `SELECT exercise_id, position, rest_seconds
       FROM workout_session_exercises
       WHERE session_id = ?
       ORDER BY position ASC`,
      [sessionId],
    ) ?? [];
  const orderedExercises = mergeExerciseRows(
    exerciseRows,
    buildFallbackExerciseRows(db, sessionId),
  );
  const setRows = db.getAllSync<WorkoutTemplateUpdateSetRow>(
    `SELECT exercise_id, position, reps, weight
     FROM workout_sets
     WHERE session_id = ?
     ORDER BY COALESCE(position, 0) ASC, rowid ASC`,
    [sessionId],
  );
  const routineExercises = buildRoutineExerciseInputs(
    orderedExercises,
    setRows,
  );
  const appliedAt = Date.now();

  db.withTransactionSync(() => {
    replaceRoutineExerciseTemplates(
      db,
      sessionRow.routine_id as string,
      routineExercises,
    );
    db.runSync(
      'UPDATE workout_sessions SET template_applied_at = ? WHERE id = ?',
      [appliedAt, sessionId],
    );
  });

  return {
    routineName:
      sessionRow.routine_name ?? sessionRow.snapshot_name ?? 'Routine',
    canApply: false,
    appliedAt,
  };
}
