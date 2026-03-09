import type { Database } from '@nozbe/watermelondb';

import { Exercise } from './models';
import defaultExercises from './seed-data/default-exercises.json';

interface ExerciseSeedEntry {
  name: string;
  muscleGroup: string;
}

/**
 * Seeds the exercises table with a curated list of common exercises.
 *
 * This is a one-time operation: if the table already contains any records
 * the function returns immediately without modifying the database.
 *
 * @param db - The WatermelonDB `Database` instance to seed.
 */
export async function seedDefaultExercises(db: Database): Promise<void> {
  const exercisesCollection = db.get<Exercise>(Exercise.table);
  const count = await exercisesCollection.query().fetchCount();

  if (count > 0) {
    return;
  }

  await db.write(async () => {
    const batch = (defaultExercises as ExerciseSeedEntry[]).map((entry) =>
      exercisesCollection.prepareCreate((record: Exercise) => {
        record.name = entry.name;
        record.muscleGroup = entry.muscleGroup;
      }),
    );

    await db.batch(...batch);
  });
}
