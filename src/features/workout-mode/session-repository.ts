import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Schedule,
  ScheduleEntry,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@core/database/types';
import { generateId } from '@core/database/utils';
import { getNextPosition } from '@features/schedule';
import type {
  ActiveWorkoutExercise,
  ActiveWorkoutSession,
  ActiveWorkoutSet,
  ExerciseNameRow,
  PreviousExercisePerformance,
  PreviousExercisePerformanceRow,
  WorkoutSessionRow,
  WorkoutSetRow,
} from './types';

interface WorkoutSessionExerciseRow extends Pick<
  WorkoutSessionExercise,
  | 'id'
  | 'session_id'
  | 'exercise_id'
  | 'position'
  | 'rest_seconds'
  | 'progression_policy'
  | 'target_rir'
> {}

function buildFallbackSessionExerciseRows(
  setRows: WorkoutSetRow[],
  sessionId: string,
): WorkoutSessionExerciseRow[] {
  return [...new Set(setRows.map((row: WorkoutSetRow) => row.exercise_id))].map(
    (exerciseId, position) => ({
      id: `fallback-${sessionId}-${exerciseId}`,
      session_id: sessionId,
      exercise_id: exerciseId,
      position,
      rest_seconds: null,
      progression_policy: 'double_progression',
      target_rir: null,
    }),
  );
}

function mergeSessionExerciseRows(
  sessionExerciseRows: WorkoutSessionExerciseRow[],
  fallbackExerciseRows: WorkoutSessionExerciseRow[],
): WorkoutSessionExerciseRow[] {
  if (sessionExerciseRows.length === 0) {
    return fallbackExerciseRows;
  }

  const rowsByExerciseId = new Map(
    sessionExerciseRows.map((row) => [row.exercise_id, row]),
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

function loadExerciseRows(
  db: SQLiteDatabase,
  sessionId: string,
): {
  exerciseRows: ExerciseNameRow[];
  sessionExerciseRows: WorkoutSessionExerciseRow[];
  setRows: WorkoutSetRow[];
} {
  const sessionExerciseRows = db.getAllSync<WorkoutSessionExerciseRow>(
    `SELECT id, session_id, exercise_id, position, rest_seconds, progression_policy, target_rir
     FROM workout_session_exercises
     WHERE session_id = ?
     ORDER BY position ASC`,
    [sessionId],
  );
  const setRows = db.getAllSync<WorkoutSetRow>(
    `SELECT ws.id, ws.session_id, ws.exercise_id, ws.position, ws.weight, ws.reps, ws.is_completed, ws.target_sets, ws.target_reps, ws.target_reps_min, ws.target_reps_max, ws.actual_rir, ws.set_role
     FROM workout_sets ws
     WHERE ws.session_id = ?
     ORDER BY COALESCE(ws.position, 0) ASC, ws.rowid ASC`,
    [sessionId],
  );
  const fallbackExerciseRows = buildFallbackSessionExerciseRows(
    setRows,
    sessionId,
  );
  const orderedSessionExerciseRows = mergeSessionExerciseRows(
    sessionExerciseRows,
    fallbackExerciseRows,
  );
  const exerciseIds = orderedSessionExerciseRows.map((row) => row.exercise_id);
  const exerciseRows =
    exerciseIds.length > 0
      ? db.getAllSync<ExerciseNameRow>(
          `SELECT id, name FROM exercises WHERE id IN (${exerciseIds.map(() => '?').join(', ')})`,
          exerciseIds,
        )
      : [];

  return {
    exerciseRows,
    sessionExerciseRows: orderedSessionExerciseRows,
    setRows,
  };
}

function buildActiveWorkoutSession(
  sessionRow: WorkoutSessionRow,
  sessionExerciseRows: WorkoutSessionExerciseRow[],
  setRows: WorkoutSetRow[],
  exerciseRows: ExerciseNameRow[],
): ActiveWorkoutSession {
  const exerciseNames = new Map<string, string>(
    exerciseRows.map((row: ExerciseNameRow) => [row.id, row.name]),
  );
  const setRowsByExerciseId = new Map<string, ActiveWorkoutSet[]>();

  for (const row of setRows) {
    const exerciseSets = setRowsByExerciseId.get(row.exercise_id) ?? [];
    exerciseSets.push({
      id: row.id,
      exerciseId: row.exercise_id,
      position: row.position,
      reps: row.reps,
      weight: row.weight,
      isCompleted: row.is_completed === 1,
      targetSets: row.target_sets,
      targetReps: row.target_reps,
      targetRepsMin: row.target_reps_min ?? row.target_reps,
      targetRepsMax:
        row.target_reps_max ?? row.target_reps_min ?? row.target_reps,
      actualRir: row.actual_rir ?? null,
      setRole: row.set_role ?? 'work',
    });
    setRowsByExerciseId.set(row.exercise_id, exerciseSets);
  }

  const exercises: ActiveWorkoutExercise[] = sessionExerciseRows.map((row) => {
    const exerciseSets = setRowsByExerciseId.get(row.exercise_id) ?? [];

    return {
      exerciseId: row.exercise_id,
      exerciseName: exerciseNames.get(row.exercise_id) ?? 'Exercise',
      restSeconds: row.rest_seconds,
      progressionPolicy: row.progression_policy ?? 'double_progression',
      targetRir: row.target_rir ?? null,
      targetSets: exerciseSets[0]?.targetSets ?? null,
      targetReps: exerciseSets[0]?.targetReps ?? null,
      targetRepsMin: exerciseSets[0]?.targetRepsMin ?? null,
      targetRepsMax: exerciseSets[0]?.targetRepsMax ?? null,
      sets: exerciseSets,
    };
  });

  return {
    id: sessionRow.id,
    title: sessionRow.snapshot_name ?? 'Free Workout',
    startTime: sessionRow.start_time,
    isFreeWorkout: sessionRow.snapshot_name === null,
    exercises,
  };
}

export function loadActiveWorkoutSession(
  db: SQLiteDatabase,
  sessionId: string,
): ActiveWorkoutSession | null {
  const sessionRow = db.getFirstSync<WorkoutSessionRow>(
    'SELECT id, snapshot_name, start_time FROM workout_sessions WHERE id = ? LIMIT 1',
    [sessionId],
  );

  if (!sessionRow) {
    return null;
  }

  const { exerciseRows, sessionExerciseRows, setRows } = loadExerciseRows(
    db,
    sessionId,
  );

  return buildActiveWorkoutSession(
    sessionRow,
    sessionExerciseRows,
    setRows,
    exerciseRows,
  );
}

export function loadInProgressWorkoutSession(
  db: SQLiteDatabase,
  sessionId: string,
): ActiveWorkoutSession | null {
  const sessionRow = db.getFirstSync<WorkoutSessionRow>(
    'SELECT id, snapshot_name, start_time FROM workout_sessions WHERE id = ? AND end_time IS NULL LIMIT 1',
    [sessionId],
  );

  if (!sessionRow) {
    return null;
  }

  const { exerciseRows, sessionExerciseRows, setRows } = loadExerciseRows(
    db,
    sessionId,
  );

  return buildActiveWorkoutSession(
    sessionRow,
    sessionExerciseRows,
    setRows,
    exerciseRows,
  );
}

export function loadLatestInProgressWorkoutSession(
  db: SQLiteDatabase,
): ActiveWorkoutSession | null {
  const sessionRow = db.getFirstSync<WorkoutSessionRow>(
    'SELECT id, snapshot_name, start_time FROM workout_sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1',
  );

  if (!sessionRow) {
    return null;
  }

  const { exerciseRows, sessionExerciseRows, setRows } = loadExerciseRows(
    db,
    sessionRow.id,
  );

  return buildActiveWorkoutSession(
    sessionRow,
    sessionExerciseRows,
    setRows,
    exerciseRows,
  );
}

export function createWorkoutSessionExerciseRecord(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
  position: number,
  restSeconds: number | null,
  progressionPolicy: NonNullable<
    WorkoutSessionExerciseRow['progression_policy']
  >,
  targetRir: number | null,
): WorkoutSessionExerciseRow {
  const sessionExerciseId = generateId();
  db.runSync(
    `INSERT INTO workout_session_exercises (
      id,
      session_id,
      exercise_id,
      position,
      rest_seconds
    ) VALUES (?, ?, ?, ?, ?)`,
    [sessionExerciseId, sessionId, exerciseId, position, restSeconds],
  );

  if (
    (progressionPolicy ?? 'double_progression') !== 'double_progression' ||
    targetRir !== null
  ) {
    db.runSync(
      `UPDATE workout_session_exercises
       SET progression_policy = ?, target_rir = ?
       WHERE id = ?`,
      [progressionPolicy ?? 'double_progression', targetRir, sessionExerciseId],
    );
  }

  return {
    id: sessionExerciseId,
    session_id: sessionId,
    exercise_id: exerciseId,
    position,
    rest_seconds: restSeconds,
    progression_policy: progressionPolicy ?? 'double_progression',
    target_rir: targetRir,
  };
}

export function getNextWorkoutSessionExercisePosition(
  db: SQLiteDatabase,
  sessionId: string,
): number {
  return (
    (db.getFirstSync<{ max_position: number | null }>(
      `SELECT MAX(position) AS max_position
       FROM workout_session_exercises
       WHERE session_id = ?`,
      [sessionId],
    )?.max_position ?? -1) + 1
  );
}

function getNextWorkoutSetPosition(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
): number {
  return (
    (db.getFirstSync<{ max_position: number | null }>(
      `SELECT MAX(position) AS max_position
       FROM workout_sets
       WHERE session_id = ? AND exercise_id = ?`,
      [sessionId, exerciseId],
    )?.max_position ?? -1) + 1
  );
}

export function createWorkoutSetRecord(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
  reps: number,
  weight: number,
  targetSets: number | null,
  targetRepsMin: number | null,
  targetRepsMax: number | null,
  setRole: ActiveWorkoutSet['setRole'] = 'optional',
): ActiveWorkoutSet {
  const setId = generateId();
  const position = getNextWorkoutSetPosition(db, sessionId, exerciseId);
  const targetReps = targetRepsMin;
  db.runSync(
    `INSERT INTO workout_sets (
      id,
      session_id,
      exercise_id,
      position,
      weight,
      reps,
      is_completed,
      target_sets,
      target_reps
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      setId,
      sessionId,
      exerciseId,
      position,
      weight,
      reps,
      0,
      targetSets,
      targetReps,
    ],
  );

  if (
    targetRepsMin !== targetReps ||
    targetRepsMax !== targetReps ||
    setRole !== 'optional'
  ) {
    db.runSync(
      `UPDATE workout_sets
       SET target_reps_min = ?, target_reps_max = ?, set_role = ?
       WHERE id = ?`,
      [targetRepsMin, targetRepsMax, setRole, setId],
    );
  }

  return {
    id: setId,
    exerciseId,
    position,
    reps,
    weight,
    isCompleted: false,
    targetSets,
    targetReps: targetRepsMin,
    targetRepsMin,
    targetRepsMax,
    actualRir: null,
    setRole,
  };
}

export function updateWorkoutSetReps(
  db: SQLiteDatabase,
  setId: string,
  reps: number,
): void {
  db.runSync(
    'UPDATE workout_sets SET reps = ?, is_completed = 1 WHERE id = ?',
    [reps, setId],
  );
}

export function updateWorkoutSetWeight(
  db: SQLiteDatabase,
  setId: string,
  weight: number,
): void {
  db.runSync(
    'UPDATE workout_sets SET weight = ?, is_completed = 1 WHERE id = ?',
    [weight, setId],
  );
}

export function updateWorkoutSetCompletion(
  db: SQLiteDatabase,
  setId: string,
  isCompleted: boolean,
): void {
  db.runSync('UPDATE workout_sets SET is_completed = ? WHERE id = ?', [
    isCompleted ? 1 : 0,
    setId,
  ]);
}

export function updateWorkoutSetActualRir(
  db: SQLiteDatabase,
  setId: string,
  actualRir: number | null,
): void {
  db.runSync('UPDATE workout_sets SET actual_rir = ? WHERE id = ?', [
    actualRir,
    setId,
  ]);
}

export function deleteWorkoutSetRecord(
  db: SQLiteDatabase,
  setId: string,
): void {
  db.runSync('DELETE FROM workout_sets WHERE id = ?', [setId]);
}

export function deleteWorkoutExerciseRecords(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
): void {
  db.runSync(
    'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
  db.runSync(
    'DELETE FROM workout_session_exercises WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
}

export function updateWorkoutSessionExerciseRest(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
  restSeconds: number,
): void {
  db.runSync(
    `UPDATE workout_session_exercises
     SET rest_seconds = ?
     WHERE session_id = ? AND exercise_id = ?`,
    [restSeconds, sessionId, exerciseId],
  );
}

export function completeWorkoutSessionRecord(
  db: SQLiteDatabase,
  sessionId: string,
  endTime: number,
): void {
  db.withTransactionSync(() => {
    db.runSync('UPDATE workout_sessions SET end_time = ? WHERE id = ?', [
      endTime,
      sessionId,
    ]);

    const sessionRow = db.getFirstSync<
      Pick<WorkoutSession, 'id' | 'schedule_id'>
    >('SELECT id, schedule_id FROM workout_sessions WHERE id = ? LIMIT 1', [
      sessionId,
    ]);

    if (!sessionRow?.schedule_id) {
      return;
    }

    const schedule = db.getFirstSync<Pick<Schedule, 'id' | 'current_position'>>(
      'SELECT id, current_position FROM schedules WHERE id = ? LIMIT 1',
      [sessionRow.schedule_id],
    );

    if (!schedule) {
      return;
    }

    const entries = db.getAllSync<Pick<ScheduleEntry, 'position'>>(
      'SELECT position FROM schedule_entries WHERE schedule_id = ? ORDER BY position ASC',
      [sessionRow.schedule_id],
    );

    if (entries.length === 0) {
      return;
    }

    const nextCompletedPosition = getNextPosition(
      schedule.current_position,
      entries.length,
    );

    db.runSync('UPDATE schedules SET current_position = ? WHERE id = ?', [
      nextCompletedPosition,
      sessionRow.schedule_id,
    ]);
  });
}

export function deleteWorkoutSessionRecord(
  db: SQLiteDatabase,
  sessionId: string,
): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM workout_session_exercises WHERE session_id = ?', [
      sessionId,
    ]);
    db.runSync('DELETE FROM workout_sets WHERE session_id = ?', [sessionId]);
    db.runSync('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
  });
}

export function loadPreviousExercisePerformanceMap(
  db: SQLiteDatabase,
  currentSessionId: string,
  exerciseIds: string[],
): Record<string, PreviousExercisePerformance | null> {
  if (exerciseIds.length === 0) {
    return {};
  }

  const rows = db.getAllSync<PreviousExercisePerformanceRow>(
    `SELECT workout_sets.exercise_id, workout_sets.reps, workout_sets.weight, workout_sessions.end_time
      FROM workout_sets
      INNER JOIN workout_sessions ON workout_sessions.id = workout_sets.session_id
      WHERE workout_sets.exercise_id IN (${exerciseIds.map(() => '?').join(', ')})
        AND workout_sets.session_id != ?
        AND workout_sets.is_completed = 1
        AND workout_sessions.end_time IS NOT NULL
      ORDER BY workout_sessions.end_time DESC, COALESCE(workout_sets.position, 0) DESC, workout_sets.rowid DESC`,
    [...exerciseIds, currentSessionId],
  );

  const performanceByExerciseId = Object.fromEntries(
    exerciseIds.map((exerciseId) => [exerciseId, null]),
  ) as Record<string, PreviousExercisePerformance | null>;

  for (const row of rows) {
    if (performanceByExerciseId[row.exercise_id] !== null) {
      continue;
    }

    performanceByExerciseId[row.exercise_id] = {
      reps: row.reps,
      weight: row.weight,
      completedAt: row.end_time,
    };
  }

  return performanceByExerciseId;
}
