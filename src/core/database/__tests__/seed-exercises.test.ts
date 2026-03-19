import type { SQLiteDatabase } from 'expo-sqlite';

import defaultExercises from '../seed-data/default-exercises.json';
import { seedDefaultExercises } from '../seed-exercises';

interface SeedExercisesDbMock extends Partial<SQLiteDatabase> {
  getAllSync: jest.Mock;
  runSync: jest.Mock;
  withTransactionSync: jest.Mock;
}

function createSeedExercisesDbMock(
  existingNames: string[],
): SeedExercisesDbMock {
  const names = new Set(existingNames);
  const defaultExerciseNames = defaultExercises.map(
    (exercise) => exercise.name,
  );

  return {
    getAllSync: jest.fn((sql: string, params?: unknown[]) => {
      if (
        sql ===
        `SELECT name FROM exercises WHERE name IN (${defaultExerciseNames
          .map(() => '?')
          .join(', ')})`
      ) {
        const requestedNames = (params ?? []) as string[];

        return requestedNames
          .filter((name) => names.has(name))
          .map((name) => ({ name }));
      }

      return [];
    }),
    runSync: jest.fn((sql: string, params?: unknown[]) => {
      if (
        sql ===
          'INSERT INTO exercises (id, name, muscle_group, how_to, equipment) VALUES (?, ?, ?, ?, ?)' &&
        typeof params?.[1] === 'string'
      ) {
        names.add(params[1]);
      }
    }),
    withTransactionSync: jest.fn((fn: () => void) => fn()),
  };
}

describe('seedDefaultExercises', () => {
  it('inserts only missing exercises and becomes a no-op on repeat runs', () => {
    const existingNames = [defaultExercises[0].name, defaultExercises[1].name];
    const db = createSeedExercisesDbMock(existingNames);
    const totalExercises = defaultExercises.length;

    seedDefaultExercises(db as SQLiteDatabase);

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
    expect(db.runSync).toHaveBeenCalledTimes(
      totalExercises - existingNames.length,
    );

    db.runSync.mockClear();
    db.withTransactionSync.mockClear();

    seedDefaultExercises(db as SQLiteDatabase);

    expect(db.withTransactionSync).not.toHaveBeenCalled();
    expect(db.runSync).not.toHaveBeenCalled();
  });

  it('queries only the default catalog names instead of scanning all exercises', () => {
    const db = createSeedExercisesDbMock([]);

    seedDefaultExercises(db as SQLiteDatabase);

    expect(db.getAllSync).toHaveBeenCalledWith(
      `SELECT name FROM exercises WHERE name IN (${defaultExercises
        .map(() => '?')
        .join(', ')})`,
      defaultExercises.map((exercise) => exercise.name),
    );
  });
});
