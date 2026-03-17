import type { SQLiteDatabase } from 'expo-sqlite';

import { seedDefaultExercises } from './seed-exercises';
import { developmentSeedData } from './seed-data/development-seed';

interface ExerciseNameRow {
  id: string;
  name: string;
}

function resolveExerciseIds(
  db: SQLiteDatabase,
  exerciseNames: string[],
): Map<string, string> {
  if (exerciseNames.length === 0) {
    return new Map();
  }

  const rows = db.getAllSync<ExerciseNameRow>(
    `SELECT id, name FROM exercises WHERE name IN (${exerciseNames
      .map(() => '?')
      .join(', ')})`,
    exerciseNames,
  );

  return new Map(rows.map((row: ExerciseNameRow) => [row.name, row.id]));
}

function requireExerciseId(
  idsByName: Map<string, string>,
  exerciseName: string,
): string {
  const exerciseId = idsByName.get(exerciseName);

  if (!exerciseId) {
    throw new Error(
      `Development seed requires exercise "${exerciseName}" to exist.`,
    );
  }

  return exerciseId;
}

function collectRequiredExerciseNames(): string[] {
  const names = new Set<string>();

  for (const routine of developmentSeedData.routines) {
    for (const exercise of routine.exercises) {
      names.add(exercise.exerciseName);
    }
  }

  for (const session of developmentSeedData.workoutSessions) {
    for (const set of session.sets) {
      names.add(set.exerciseName);
    }
  }

  return [...names];
}

/**
 * Seeds a realistic development dataset for local QA.
 *
 * The seed is additive and idempotent for the fixed development records,
 * so it is safe to run on every app launch in development mode.
 */
export function seedDevelopmentDatabase(db: SQLiteDatabase): void {
  seedDefaultExercises(db);

  const exerciseIdsByName = resolveExerciseIds(
    db,
    collectRequiredExerciseNames(),
  );

  db.withTransactionSync(() => {
    for (const routine of developmentSeedData.routines) {
      db.runSync(
        'INSERT OR REPLACE INTO routines (id, name, notes) VALUES (?, ?, ?)',
        [routine.id, routine.name, routine.notes],
      );

      for (const exercise of routine.exercises) {
        db.runSync(
          'INSERT OR REPLACE INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps) VALUES (?, ?, ?, ?, ?, ?)',
          [
            exercise.id,
            routine.id,
            requireExerciseId(exerciseIdsByName, exercise.exerciseName),
            exercise.position,
            exercise.targetSets,
            exercise.targetReps,
          ],
        );
      }
    }

    for (const schedule of developmentSeedData.schedules) {
      db.runSync(
        'INSERT OR REPLACE INTO schedules (id, name, is_active, current_position) VALUES (?, ?, ?, ?)',
        [
          schedule.id,
          schedule.name,
          schedule.isActive,
          schedule.currentPosition,
        ],
      );

      for (const entry of schedule.entries) {
        db.runSync(
          'INSERT OR REPLACE INTO schedule_entries (id, schedule_id, routine_id, position) VALUES (?, ?, ?, ?)',
          [entry.id, schedule.id, entry.routineId, entry.position],
        );
      }
    }

    for (const session of developmentSeedData.workoutSessions) {
      db.runSync(
        'INSERT OR REPLACE INTO workout_sessions (id, routine_id, schedule_id, snapshot_name, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
        [
          session.id,
          session.routineId,
          session.scheduleId,
          session.snapshotName,
          session.startTime,
          session.endTime,
        ],
      );

      for (const set of session.sets) {
        db.runSync(
          'INSERT OR REPLACE INTO workout_sets (id, session_id, exercise_id, weight, reps, is_completed, target_sets, target_reps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            set.id,
            session.id,
            requireExerciseId(exerciseIdsByName, set.exerciseName),
            set.weight,
            set.reps,
            set.isCompleted,
            set.targetSets,
            set.targetReps,
          ],
        );
      }
    }

    for (const entry of developmentSeedData.bodyWeightEntries) {
      db.runSync(
        'INSERT OR REPLACE INTO body_weight_entries (id, weight, unit, logged_at, notes) VALUES (?, ?, ?, ?, ?)',
        [entry.id, entry.weight, entry.unit, entry.loggedAt, entry.notes],
      );
    }
  });
}
