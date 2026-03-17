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

  return {
    getAllSync: jest.fn((sql: string) => {
      if (sql === 'SELECT name FROM exercises') {
        return [...names].map((name) => ({ name }));
      }

      return [];
    }),
    runSync: jest.fn((sql: string, params?: unknown[]) => {
      if (
        sql ===
          'INSERT INTO exercises (id, name, muscle_group) VALUES (?, ?, ?)' &&
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
});
