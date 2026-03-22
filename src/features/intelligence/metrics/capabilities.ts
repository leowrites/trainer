/**
 * Exercise capability reads.
 *
 * CALLING SPEC:
 * - `loadExerciseCapabilities(db)` returns a stable capability map keyed by
 *   `exercise_id`.
 * - Capability data controls how aggressively strength-estimation logic is used.
 * - Side effects: reads SQLite only.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { ExerciseCapability } from '../types';

interface ExerciseCapabilityRow {
  id: string;
  name: string;
  muscle_group: string;
  strength_estimation_mode: 'primary' | 'limited' | 'disabled';
}

function inferStrengthEstimationMode(
  exerciseName: string,
  strengthEstimationMode: ExerciseCapabilityRow['strength_estimation_mode'],
): 'primary' | 'limited' | 'disabled' {
  if (
    strengthEstimationMode === 'primary' ||
    strengthEstimationMode === 'disabled'
  ) {
    return strengthEstimationMode;
  }

  const normalizedName = exerciseName.toLowerCase();

  if (
    /bench press|back squat|front squat|deadlift|overhead press|barbell row|pendlay row|t-bar row/.test(
      normalizedName,
    )
  ) {
    return 'primary';
  }

  if (
    /pulldown|seated cable row|dumbbell row|leg press|dumbbell shoulder press|dip|hip thrust|romanian deadlift/.test(
      normalizedName,
    )
  ) {
    return 'limited';
  }

  return strengthEstimationMode ?? 'disabled';
}

export function loadExerciseCapabilities(
  db: Pick<SQLiteDatabase, 'getAllSync'>,
): Record<string, ExerciseCapability> {
  const rows = db.getAllSync<ExerciseCapabilityRow>(
    `SELECT id, name, muscle_group, strength_estimation_mode
     FROM exercises
     WHERE is_deleted = 0
     ORDER BY name ASC`,
  );

  return rows.reduce<Record<string, ExerciseCapability>>((index, row) => {
    index[row.id] = {
      exerciseId: row.id,
      exerciseName: row.name,
      muscleGroup: row.muscle_group,
      strengthEstimationMode: inferStrengthEstimationMode(
        row.name,
        row.strength_estimation_mode,
      ),
    };
    return index;
  }, {});
}
