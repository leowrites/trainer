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

async function loadExerciseRows(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<{
  exerciseRows: ExerciseNameRow[];
  sessionExerciseRows: WorkoutSessionExerciseRow[];
  setRows: WorkoutSetRow[];
}> {
  const sessionExerciseRows = await db.getAllAsync<WorkoutSessionExerciseRow>(
    `SELECT id, session_id, exercise_id, position, rest_seconds, progression_policy, target_rir
     FROM workout_session_exercises
     WHERE session_id = ?
     ORDER BY position ASC`,
    [sessionId],
  );
  const setRows = await db.getAllAsync<WorkoutSetRow>(
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
      ? await db.getAllAsync<ExerciseNameRow>(
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
      targetWeight: row.weight,
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

export async function loadActiveWorkoutSession(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<ActiveWorkoutSession | null> {
  const sessionRow = await db.getFirstAsync<WorkoutSessionRow>(
    'SELECT id, snapshot_name, start_time FROM workout_sessions WHERE id = ? LIMIT 1',
    [sessionId],
  );

  if (!sessionRow) {
    return null;
  }

  const { exerciseRows, sessionExerciseRows, setRows } = await loadExerciseRows(
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

export async function loadInProgressWorkoutSession(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<ActiveWorkoutSession | null> {
  const sessionRow = await db.getFirstAsync<WorkoutSessionRow>(
    'SELECT id, snapshot_name, start_time FROM workout_sessions WHERE id = ? AND end_time IS NULL LIMIT 1',
    [sessionId],
  );

  if (!sessionRow) {
    return null;
  }

  const { exerciseRows, sessionExerciseRows, setRows } = await loadExerciseRows(
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

export async function loadLatestInProgressWorkoutSession(
  db: SQLiteDatabase,
): Promise<ActiveWorkoutSession | null> {
  const sessionRow = await db.getFirstAsync<WorkoutSessionRow>(
    'SELECT id, snapshot_name, start_time FROM workout_sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1',
  );

  if (!sessionRow) {
    return null;
  }

  const { exerciseRows, sessionExerciseRows, setRows } = await loadExerciseRows(
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

export async function createWorkoutSessionExerciseRecord(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
  position: number,
  restSeconds: number | null,
  progressionPolicy: NonNullable<
    WorkoutSessionExerciseRow['progression_policy']
  >,
  targetRir: number | null,
): Promise<WorkoutSessionExerciseRow> {
  const sessionExerciseId = generateId();
  await db.runAsync(
    `INSERT INTO workout_session_exercises (
      id,
      session_id,
      exercise_id,
      position,
      rest_seconds,
      progression_policy,
      target_rir
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionExerciseId,
      sessionId,
      exerciseId,
      position,
      restSeconds,
      progressionPolicy ?? 'double_progression',
      targetRir,
    ],
  );

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

export async function getNextWorkoutSessionExercisePosition(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<number> {
  return (
    ((
      await db.getFirstAsync<{ max_position: number | null }>(
        `SELECT MAX(position) AS max_position
       FROM workout_session_exercises
       WHERE session_id = ?`,
        [sessionId],
      )
    )?.max_position ?? -1) + 1
  );
}

async function getNextWorkoutSetPosition(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
): Promise<number> {
  return (
    ((
      await db.getFirstAsync<{ max_position: number | null }>(
        `SELECT MAX(position) AS max_position
       FROM workout_sets
       WHERE session_id = ? AND exercise_id = ?`,
        [sessionId, exerciseId],
      )
    )?.max_position ?? -1) + 1
  );
}

export async function createWorkoutSetRecord(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
  reps: number,
  weight: number,
  targetSets: number | null,
  targetRepsMin: number | null,
  targetRepsMax: number | null,
  setRole: ActiveWorkoutSet['setRole'] = 'optional',
): Promise<ActiveWorkoutSet> {
  const setId = generateId();
  const position = await getNextWorkoutSetPosition(db, sessionId, exerciseId);
  const targetReps = targetRepsMin;
  await db.runAsync(
    `INSERT INTO workout_sets (
      id,
      session_id,
      exercise_id,
      position,
      weight,
      reps,
      is_completed,
      target_sets,
      target_reps,
      target_reps_min,
      target_reps_max,
      set_role
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      targetRepsMin,
      targetRepsMax,
      setRole,
    ],
  );

  return {
    id: setId,
    exerciseId,
    position,
    reps,
    weight,
    targetWeight: weight,
    isCompleted: false,
    targetSets,
    targetReps: targetRepsMin,
    targetRepsMin,
    targetRepsMax,
    actualRir: null,
    setRole,
  };
}

export async function updateWorkoutSetReps(
  db: SQLiteDatabase,
  setId: string,
  reps: number,
): Promise<void> {
  await db.runAsync(
    'UPDATE workout_sets SET reps = ?, is_completed = 1 WHERE id = ?',
    [reps, setId],
  );
}

export async function updateWorkoutSetWeight(
  db: SQLiteDatabase,
  setId: string,
  weight: number,
): Promise<void> {
  await db.runAsync(
    'UPDATE workout_sets SET weight = ?, is_completed = 1 WHERE id = ?',
    [weight, setId],
  );
}

export async function updateWorkoutSetCompletion(
  db: SQLiteDatabase,
  setId: string,
  isCompleted: boolean,
): Promise<void> {
  await db.runAsync('UPDATE workout_sets SET is_completed = ? WHERE id = ?', [
    isCompleted ? 1 : 0,
    setId,
  ]);
}

export async function updateWorkoutSetActualRir(
  db: SQLiteDatabase,
  setId: string,
  actualRir: number | null,
): Promise<void> {
  await db.runAsync('UPDATE workout_sets SET actual_rir = ? WHERE id = ?', [
    actualRir,
    setId,
  ]);
}

export async function updateWorkoutSetFields(
  db: SQLiteDatabase,
  setId: string,
  changes: Partial<
    Pick<ActiveWorkoutSet, 'reps' | 'weight' | 'isCompleted' | 'actualRir'>
  >,
): Promise<void> {
  const assignments: string[] = [];
  const values: Array<number | null | string> = [];

  if (changes.reps !== undefined) {
    assignments.push('reps = ?');
    values.push(changes.reps);
  }

  if (changes.weight !== undefined) {
    assignments.push('weight = ?');
    values.push(changes.weight);
  }

  if (changes.isCompleted !== undefined) {
    assignments.push('is_completed = ?');
    values.push(changes.isCompleted ? 1 : 0);
  }

  if (changes.actualRir !== undefined) {
    assignments.push('actual_rir = ?');
    values.push(changes.actualRir);
  }

  if (assignments.length === 0) {
    return;
  }

  await db.runAsync(
    `UPDATE workout_sets
     SET ${assignments.join(', ')}
     WHERE id = ?`,
    [...values, setId],
  );
}

export async function deleteWorkoutSetRecord(
  db: SQLiteDatabase,
  setId: string,
): Promise<void> {
  await db.runAsync('DELETE FROM workout_sets WHERE id = ?', [setId]);
}

export async function deleteWorkoutExerciseRecords(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
): Promise<void> {
  await db.runAsync(
    'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
  await db.runAsync(
    'DELETE FROM workout_session_exercises WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
  );
}

export async function updateWorkoutSessionExerciseRest(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
  restSeconds: number,
): Promise<void> {
  await db.runAsync(
    `UPDATE workout_session_exercises
     SET rest_seconds = ?
     WHERE session_id = ? AND exercise_id = ?`,
    [restSeconds, sessionId, exerciseId],
  );
}

export async function completeWorkoutSessionRecord(
  db: SQLiteDatabase,
  sessionId: string,
  endTime: number,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE workout_sessions SET end_time = ? WHERE id = ?', [
      endTime,
      sessionId,
    ]);

    const sessionRow = await db.getFirstAsync<
      Pick<WorkoutSession, 'id' | 'schedule_id'>
    >('SELECT id, schedule_id FROM workout_sessions WHERE id = ? LIMIT 1', [
      sessionId,
    ]);

    if (!sessionRow?.schedule_id) {
      return;
    }

    const schedule = await db.getFirstAsync<
      Pick<Schedule, 'id' | 'current_position'>
    >('SELECT id, current_position FROM schedules WHERE id = ? LIMIT 1', [
      sessionRow.schedule_id,
    ]);

    if (!schedule) {
      return;
    }

    const entries = await db.getAllAsync<Pick<ScheduleEntry, 'position'>>(
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

    await db.runAsync(
      'UPDATE schedules SET current_position = ? WHERE id = ?',
      [nextCompletedPosition, sessionRow.schedule_id],
    );
  });
}

export async function deleteWorkoutSessionRecord(
  db: SQLiteDatabase,
  sessionId: string,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM workout_session_exercises WHERE session_id = ?',
      [sessionId],
    );
    await db.runAsync('DELETE FROM workout_sets WHERE session_id = ?', [
      sessionId,
    ]);
    await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
  });
}

export async function loadPreviousExercisePerformanceMap(
  db: SQLiteDatabase,
  currentSessionId: string,
  exerciseIds: string[],
): Promise<Record<string, PreviousExercisePerformance | null>> {
  if (exerciseIds.length === 0) {
    return {};
  }

  const rows = await db.getAllAsync<PreviousExercisePerformanceRow>(
    `WITH latest_completed_sessions AS (
        SELECT
          workout_sets.exercise_id,
          MAX(workout_sessions.end_time) AS latest_end_time
        FROM workout_sets
        INNER JOIN workout_sessions
          ON workout_sessions.id = workout_sets.session_id
        WHERE workout_sets.exercise_id IN (${exerciseIds.map(() => '?').join(', ')})
          AND workout_sets.session_id != ?
          AND workout_sets.is_completed = 1
          AND workout_sessions.end_time IS NOT NULL
        GROUP BY workout_sets.exercise_id
      ),
      latest_ranked_sets AS (
        SELECT
          workout_sets.exercise_id,
          workout_sets.reps,
          workout_sets.weight,
          workout_sessions.end_time,
          ROW_NUMBER() OVER (
            PARTITION BY workout_sets.exercise_id
            ORDER BY COALESCE(workout_sets.position, 0) DESC, workout_sets.rowid DESC
          ) AS set_rank
        FROM workout_sets
        INNER JOIN workout_sessions
          ON workout_sessions.id = workout_sets.session_id
        INNER JOIN latest_completed_sessions
          ON latest_completed_sessions.exercise_id = workout_sets.exercise_id
         AND latest_completed_sessions.latest_end_time = workout_sessions.end_time
        WHERE workout_sets.exercise_id IN (${exerciseIds.map(() => '?').join(', ')})
          AND workout_sets.session_id != ?
          AND workout_sets.is_completed = 1
          AND workout_sessions.end_time IS NOT NULL
      )
      SELECT exercise_id, reps, weight, end_time
      FROM latest_ranked_sets
      WHERE set_rank = 1`,
    [...exerciseIds, currentSessionId, ...exerciseIds, currentSessionId],
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
