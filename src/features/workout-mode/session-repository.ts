import type { SQLiteDatabase } from 'expo-sqlite';

import { generateId } from '@core/database/utils';
import type {
  ActiveWorkoutExercise,
  ActiveWorkoutSession,
  ActiveWorkoutSet,
  ExerciseNameRow,
  WorkoutSessionRow,
  WorkoutSetRow,
} from './types';

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
}

export function completeWorkoutSessionRecord(
  db: SQLiteDatabase,
  sessionId: string,
  endTime: number,
): void {
  db.runSync('UPDATE workout_sessions SET end_time = ? WHERE id = ?', [
    endTime,
    sessionId,
  ]);
}
