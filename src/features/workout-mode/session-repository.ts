import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Schedule,
  ScheduleEntry,
  WorkoutSession,
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

function loadExerciseRows(
  db: SQLiteDatabase,
  sessionId: string,
): {
  exerciseRows: ExerciseNameRow[];
  setRows: WorkoutSetRow[];
} {
  const setRows = db.getAllSync<WorkoutSetRow>(
    'SELECT id, session_id, exercise_id, weight, reps, is_completed, target_sets, target_reps FROM workout_sets WHERE session_id = ? ORDER BY rowid ASC',
    [sessionId],
  );

  const exerciseIds = [
    ...new Set(setRows.map((row: WorkoutSetRow) => row.exercise_id)),
  ];
  const exerciseRows =
    exerciseIds.length > 0
      ? db.getAllSync<ExerciseNameRow>(
          `SELECT id, name FROM exercises WHERE id IN (${exerciseIds.map(() => '?').join(', ')})`,
          exerciseIds,
        )
      : [];

  return {
    exerciseRows,
    setRows,
  };
}

function buildActiveWorkoutSession(
  sessionRow: WorkoutSessionRow,
  setRows: WorkoutSetRow[],
  exerciseRows: ExerciseNameRow[],
): ActiveWorkoutSession {
  const exerciseNames = new Map<string, string>(
    exerciseRows.map((row: ExerciseNameRow) => [row.id, row.name]),
  );
  const exercises: ActiveWorkoutExercise[] = [];
  const exerciseIndex = new Map<string, number>();

  for (const row of setRows) {
    let index = exerciseIndex.get(row.exercise_id);

    if (index === undefined) {
      index = exercises.length;
      exerciseIndex.set(row.exercise_id, index);
      exercises.push({
        exerciseId: row.exercise_id,
        exerciseName: exerciseNames.get(row.exercise_id) ?? 'Exercise',
        targetSets: row.target_sets,
        targetReps: row.target_reps,
        sets: [],
      });
    }

    exercises[index].sets.push({
      id: row.id,
      exerciseId: row.exercise_id,
      reps: row.reps,
      weight: row.weight,
      isCompleted: row.is_completed === 1,
      targetSets: row.target_sets,
      targetReps: row.target_reps,
    });
  }

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

  const { exerciseRows, setRows } = loadExerciseRows(db, sessionId);

  return buildActiveWorkoutSession(sessionRow, setRows, exerciseRows);
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

  const { exerciseRows, setRows } = loadExerciseRows(db, sessionId);

  return buildActiveWorkoutSession(sessionRow, setRows, exerciseRows);
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

  const { exerciseRows, setRows } = loadExerciseRows(db, sessionRow.id);

  return buildActiveWorkoutSession(sessionRow, setRows, exerciseRows);
}

export function createWorkoutSetRecord(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
  reps: number,
  weight: number,
  targetSets: number | null,
  targetReps: number | null,
): ActiveWorkoutSet {
  const setId = generateId();
  db.runSync(
    'INSERT INTO workout_sets (id, session_id, exercise_id, weight, reps, is_completed, target_sets, target_reps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [setId, sessionId, exerciseId, weight, reps, 0, targetSets, targetReps],
  );

  return {
    id: setId,
    exerciseId,
    reps,
    weight,
    isCompleted: false,
    targetSets,
    targetReps,
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

export function deleteWorkoutSetRecord(
  db: SQLiteDatabase,
  setId: string,
): void {
  db.runSync('DELETE FROM workout_sets WHERE id = ?', [setId]);
}

export function deleteWorkoutSetsForExercise(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
): void {
  db.runSync(
    'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
    [sessionId, exerciseId],
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
      ORDER BY workout_sessions.end_time DESC, workout_sets.rowid DESC`,
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
