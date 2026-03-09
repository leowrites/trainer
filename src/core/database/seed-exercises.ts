import type { Database } from '@nozbe/watermelondb';

import { Exercise } from './models';
import exerciseSeedData from './seed-data/default-exercises.json';

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
 * The emptiness check is performed inside the write transaction to prevent
 * concurrent calls from inserting duplicate rows.
 *
 * @param db - The WatermelonDB `Database` instance to seed.
 */
export async function seedDefaultExercises(db: Database): Promise<void> {
  const exercisesCollection = db.get<Exercise>(Exercise.table);

  await db.write(async () => {
    const count = await exercisesCollection.query().fetchCount();

    if (count > 0) {
      return;
    }

    const batch = defaultExercises.map((entry) =>
      exercisesCollection.prepareCreate((record: Exercise) => {
        record.name = entry.name;
        record.muscleGroup = entry.muscleGroup;
      }),
    );

    await db.batch(...batch);
  });
}
