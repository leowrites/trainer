import type { SQLiteDatabase } from 'expo-sqlite';

import defaultExercises from '../seed-data/default-exercises.json';
import { seedDefaultExercises } from '../seed-exercises';

interface SeedExercisesDbMock extends Partial<SQLiteDatabase> {
  getAllAsync: jest.Mock;
  runAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
}

interface SeedExerciseRow {
  id: string;
  name: string;
  how_to: string | null;
  equipment: string | null;
}

function createSeedExercisesDbMock(
  existingNames: string[],
): SeedExercisesDbMock {
  const exerciseRows = new Map<string, SeedExerciseRow>(
    existingNames.map((name, index) => [
      name,
      {
        id: `exercise-${index + 1}`,
        name,
        how_to: null,
        equipment: null,
      },
    ]),
  );
  const defaultExerciseNames = defaultExercises.map(
    (exercise) => exercise.name,
  );

  return {
    getAllAsync: jest.fn(async (sql: string, params?: unknown[]) => {
      if (
        sql ===
        `SELECT id, name, how_to, equipment FROM exercises WHERE name IN (${defaultExerciseNames
          .map(() => '?')
          .join(', ')})`
      ) {
        const requestedNames = (params ?? []) as string[];

        return requestedNames
          .filter((name) => exerciseRows.has(name))
          .map((name) => exerciseRows.get(name));
      }

      return [];
    }),
    runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
      if (
        sql ===
          'INSERT INTO exercises (id, name, muscle_group, how_to, equipment) VALUES (?, ?, ?, ?, ?)' &&
        typeof params?.[1] === 'string'
      ) {
        exerciseRows.set(String(params[1]), {
          id: String(params[0]),
          name: String(params[1]),
          how_to: (params[3] as string | null) ?? null,
          equipment: (params[4] as string | null) ?? null,
        });
      }

      if (
        sql ===
          'UPDATE exercises SET how_to = COALESCE(how_to, ?), equipment = COALESCE(equipment, ?) WHERE id = ?' &&
        typeof params?.[2] === 'string'
      ) {
        const row = [...exerciseRows.values()].find(
          (exercise) => exercise.id === params[2],
        );

        if (row) {
          row.how_to = row.how_to ?? (params[0] as string | null) ?? null;
          row.equipment = row.equipment ?? (params[1] as string | null) ?? null;
        }
      }
    }),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => fn()),
  };
}

describe('seedDefaultExercises', () => {
  it('inserts only missing exercises and becomes a no-op on repeat runs', async () => {
    const existingNames = [defaultExercises[0].name, defaultExercises[1].name];
    const db = createSeedExercisesDbMock(existingNames);
    const totalExercises = defaultExercises.length;

    await seedDefaultExercises(db as SQLiteDatabase);

    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(
      totalExercises - existingNames.length,
    );

    db.runAsync.mockClear();
    db.withTransactionAsync.mockClear();

    await seedDefaultExercises(db as SQLiteDatabase);

    expect(db.withTransactionAsync).not.toHaveBeenCalled();
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('queries only the default catalog names instead of scanning all exercises', async () => {
    const db = createSeedExercisesDbMock([]);

    await seedDefaultExercises(db as SQLiteDatabase);

    expect(db.getAllAsync).toHaveBeenCalledWith(
      `SELECT id, name, how_to, equipment FROM exercises WHERE name IN (${defaultExercises
        .map(() => '?')
        .join(', ')})`,
      defaultExercises.map((exercise) => exercise.name),
    );
  });

  it('backfills metadata for existing default exercises after a schema upgrade', async () => {
    const db = createSeedExercisesDbMock(['Barbell Bench Press']);

    await seedDefaultExercises(db as SQLiteDatabase);

    expect(db.runAsync).toHaveBeenCalledWith(
      'UPDATE exercises SET how_to = COALESCE(how_to, ?), equipment = COALESCE(equipment, ?) WHERE id = ?',
      expect.arrayContaining(['Barbell and bench']),
    );
  });
});
