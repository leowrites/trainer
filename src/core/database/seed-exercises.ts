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
 * This is a one-time operation: if the table already contains any records
 * the function returns immediately without modifying the database.
 *
 * @param db - The expo-sqlite `SQLiteDatabase` instance to seed.
 */
export function seedDefaultExercises(db: SQLiteDatabase): void {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises',
  );

  if (row && row.count > 0) {
    return;
  }

  db.withTransactionSync(() => {
    for (const entry of defaultExercises) {
      db.runSync(
        'INSERT INTO exercises (id, name, muscle_group) VALUES (?, ?, ?)',
        [generateId(), entry.name, entry.muscleGroup],
      );
    }
  });
}
