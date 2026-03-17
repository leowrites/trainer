import type { SQLiteDatabase } from 'expo-sqlite';

import exerciseSeedData from './seed-data/default-exercises.json';
import { generateId } from './utils';

interface ExerciseSeedEntry {
  name: string;
  muscleGroup: string;
}

const defaultExercises: ExerciseSeedEntry[] = exerciseSeedData;

/**
 * Seeds the exercises table with a curated list of common exercises.
 *
 * The seed is idempotent: existing exercise names are left untouched and
 * only missing default entries are inserted.
 *
 * @param db - The expo-sqlite `SQLiteDatabase` instance to seed.
 */
export function seedDefaultExercises(db: SQLiteDatabase): void {
  const existingExercises = db.getAllSync<{ name: string }>(
    'SELECT name FROM exercises',
  );
  const existingNames = new Set(
    existingExercises.map((exercise: { name: string }) => exercise.name),
  );
  const missingExercises = defaultExercises.filter(
    (exercise: ExerciseSeedEntry) => !existingNames.has(exercise.name),
  );

  if (missingExercises.length === 0) {
    return;
  }

  db.withTransactionSync(() => {
    for (const entry of missingExercises) {
      db.runSync(
        'INSERT INTO exercises (id, name, muscle_group) VALUES (?, ?, ?)',
        [generateId(), entry.name, entry.muscleGroup],
      );
    }
  });
}
