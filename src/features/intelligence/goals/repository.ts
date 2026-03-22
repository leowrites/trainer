/**
 * Goals repository.
 *
 * CALLING SPEC:
 * - `listTrainingGoals(db)` reads all typed goals ordered by recency.
 * - `createTrainingGoal`, `updateTrainingGoal`, and `deleteTrainingGoal`
 *   mutate only the `training_goals` table.
 * - Side effects: writes to SQLite only.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { TrainingGoal } from '@core/database/types';
import { generateId } from '@core/database/utils';
import type { TrainingGoalInput } from '../types';
import { sanitizeTrainingGoalInput } from './domain';

export function listTrainingGoals(
  db: Pick<SQLiteDatabase, 'getAllSync'>,
): TrainingGoal[] {
  return db.getAllSync<TrainingGoal>(
    `SELECT id, goal_type, exercise_id, muscle_group, target_load, target_reps,
            target_sessions_per_week, target_sets_per_week, target_weeks,
            start_time, end_time, status, created_at, updated_at
     FROM training_goals
     ORDER BY updated_at DESC, created_at DESC`,
  );
}

export function createTrainingGoal(
  db: Pick<SQLiteDatabase, 'runSync'>,
  input: TrainingGoalInput,
): TrainingGoal {
  const sanitizedInput = sanitizeTrainingGoalInput(input);
  const now = Date.now();
  const goal: TrainingGoal = {
    id: generateId(),
    goal_type: sanitizedInput.goalType,
    exercise_id: sanitizedInput.exerciseId ?? null,
    muscle_group: sanitizedInput.muscleGroup ?? null,
    target_load: sanitizedInput.targetLoad ?? null,
    target_reps: sanitizedInput.targetReps ?? null,
    target_sessions_per_week: sanitizedInput.targetSessionsPerWeek ?? null,
    target_sets_per_week: sanitizedInput.targetSetsPerWeek ?? null,
    target_weeks: sanitizedInput.targetWeeks ?? null,
    start_time: sanitizedInput.startTime ?? null,
    end_time: sanitizedInput.endTime ?? null,
    status: sanitizedInput.status ?? 'active',
    created_at: now,
    updated_at: now,
  };

  db.runSync(
    `INSERT INTO training_goals (
      id, goal_type, exercise_id, muscle_group, target_load, target_reps,
      target_sessions_per_week, target_sets_per_week, target_weeks,
      start_time, end_time, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.id,
      goal.goal_type,
      goal.exercise_id,
      goal.muscle_group,
      goal.target_load,
      goal.target_reps,
      goal.target_sessions_per_week,
      goal.target_sets_per_week,
      goal.target_weeks,
      goal.start_time,
      goal.end_time,
      goal.status,
      goal.created_at,
      goal.updated_at,
    ],
  );

  return goal;
}

export function updateTrainingGoal(
  db: Pick<SQLiteDatabase, 'runSync'>,
  id: string,
  input: TrainingGoalInput,
): void {
  const sanitizedInput = sanitizeTrainingGoalInput(input);
  const now = Date.now();

  db.runSync(
    `UPDATE training_goals
     SET goal_type = ?, exercise_id = ?, muscle_group = ?, target_load = ?,
         target_reps = ?, target_sessions_per_week = ?, target_sets_per_week = ?,
         target_weeks = ?, start_time = ?, end_time = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [
      sanitizedInput.goalType,
      sanitizedInput.exerciseId ?? null,
      sanitizedInput.muscleGroup ?? null,
      sanitizedInput.targetLoad ?? null,
      sanitizedInput.targetReps ?? null,
      sanitizedInput.targetSessionsPerWeek ?? null,
      sanitizedInput.targetSetsPerWeek ?? null,
      sanitizedInput.targetWeeks ?? null,
      sanitizedInput.startTime ?? null,
      sanitizedInput.endTime ?? null,
      sanitizedInput.status ?? 'active',
      now,
      id,
    ],
  );
}

export function deleteTrainingGoal(
  db: Pick<SQLiteDatabase, 'runSync'>,
  id: string,
): void {
  db.runSync('DELETE FROM training_goals WHERE id = ?', [id]);
}
