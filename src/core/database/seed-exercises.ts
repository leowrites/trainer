import type { SQLiteDatabase } from 'expo-sqlite';

import exerciseSeedData from './seed-data/default-exercises.json';
import { generateId } from './utils';

interface ExerciseSeedEntry {
  name: string;
  muscleGroup: string;
  howTo?: string;
  equipment?: string;
}

interface ExistingExerciseRow {
  id: string;
  name: string;
  how_to: string | null;
  equipment: string | null;
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
export async function seedDefaultExercises(db: SQLiteDatabase): Promise<void> {
  const defaultExerciseNames = defaultExercises.map(
    (exercise: ExerciseSeedEntry) => exercise.name,
  );
  const existingExercises = await db.getAllAsync<ExistingExerciseRow>(
    `SELECT id, name, how_to, equipment FROM exercises WHERE name IN (${defaultExerciseNames
      .map(() => '?')
      .join(', ')})`,
    defaultExerciseNames,
  );
  const existingByName = new Map(
    existingExercises.map((exercise: ExistingExerciseRow) => [
      exercise.name,
      exercise,
    ]),
  );
  const missingExercises = defaultExercises.filter(
    (exercise: ExerciseSeedEntry) => !existingByName.has(exercise.name),
  );
  const metadataBackfills = defaultExercises.filter(
    (exercise: ExerciseSeedEntry) => {
      const existingExercise = existingByName.get(exercise.name);

      if (!existingExercise) {
        return false;
      }

      return (
        (exercise.howTo !== undefined && existingExercise.how_to === null) ||
        (exercise.equipment !== undefined &&
          existingExercise.equipment === null)
      );
    },
  );

  if (missingExercises.length === 0 && metadataBackfills.length === 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const entry of missingExercises) {
      await db.runAsync(
        'INSERT INTO exercises (id, name, muscle_group, how_to, equipment) VALUES (?, ?, ?, ?, ?)',
        [
          generateId(),
          entry.name,
          entry.muscleGroup,
          entry.howTo ?? null,
          entry.equipment ?? null,
        ],
      );
    }

    for (const entry of metadataBackfills) {
      const existingExercise = existingByName.get(entry.name);

      if (!existingExercise) {
        continue;
      }

      await db.runAsync(
        'UPDATE exercises SET how_to = COALESCE(how_to, ?), equipment = COALESCE(equipment, ?) WHERE id = ?',
        [entry.howTo ?? null, entry.equipment ?? null, existingExercise.id],
      );
    }
  });
}
