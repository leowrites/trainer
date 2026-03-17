import type { SQLiteDatabase } from 'expo-sqlite';

import { developmentSeedData } from '../seed-data/development-seed';

jest.mock('../seed-exercises', () => ({
  seedDefaultExercises: jest.fn(),
}));

import { seedDefaultExercises } from '../seed-exercises';
import { seedDevelopmentDatabase } from '../seed-development';

const mockSeedDefaultExercises = jest.mocked(seedDefaultExercises);

interface TableRow {
  id: string;
  [key: string]: unknown;
}

interface DevelopmentSeedDbMock extends Partial<SQLiteDatabase> {
  getAllSync: jest.Mock;
  runSync: jest.Mock;
  withTransactionSync: jest.Mock;
}

function createDevelopmentSeedDbMock(): DevelopmentSeedDbMock {
  const tables = {
    exercises: new Map<string, TableRow>(),
    routines: new Map<string, TableRow>(),
    routine_exercises: new Map<string, TableRow>(),
    schedules: new Map<string, TableRow>(),
    schedule_entries: new Map<string, TableRow>(),
    workout_sessions: new Map<string, TableRow>(),
    workout_sets: new Map<string, TableRow>(),
    body_weight_entries: new Map<string, TableRow>(),
  };

  const requiredExercises = new Map(
    [
      'Barbell Bench Press',
      'Incline Dumbbell Bench Press',
      'Overhead Press',
      'Tricep Pushdown',
      'Barbell Row',
      'Lat Pulldown',
      'Face Pull',
      'Hammer Curl',
      'Barbell Back Squat',
      'Romanian Deadlift',
      'Leg Press',
      'Standing Calf Raise',
    ].map((name, index) => [name, `exercise-${index + 1}`] as const),
  );

  for (const [name, id] of requiredExercises) {
    tables.exercises.set(id, { id, name });
  }

  return {
    getAllSync: jest.fn((sql: string, params?: unknown[]) => {
      if (sql.startsWith('SELECT id, name FROM exercises WHERE name IN')) {
        const names = (params ?? []) as string[];
        return names
          .filter((name) => requiredExercises.has(name))
          .map((name) => ({
            id: requiredExercises.get(name) as string,
            name,
          }));
      }

      return [];
    }),
    runSync: jest.fn((sql: string, params?: unknown[]) => {
      const values = (params ?? []) as unknown[];

      if (sql.startsWith('INSERT OR REPLACE INTO routines')) {
        tables.routines.set(String(values[0]), {
          id: String(values[0]),
          name: String(values[1]),
          notes: values[2],
        });
      } else if (sql.startsWith('INSERT OR REPLACE INTO routine_exercises')) {
        tables.routine_exercises.set(String(values[0]), {
          id: String(values[0]),
          routine_id: String(values[1]),
          exercise_id: String(values[2]),
          position: values[3],
          target_sets: values[4],
          target_reps: values[5],
        });
      } else if (sql.startsWith('INSERT OR REPLACE INTO schedules')) {
        tables.schedules.set(String(values[0]), {
          id: String(values[0]),
          name: String(values[1]),
          is_active: values[2],
          current_position: values[3],
        });
      } else if (sql.startsWith('INSERT OR REPLACE INTO schedule_entries')) {
        tables.schedule_entries.set(String(values[0]), {
          id: String(values[0]),
          schedule_id: String(values[1]),
          routine_id: String(values[2]),
          position: values[3],
        });
      } else if (sql.startsWith('INSERT OR REPLACE INTO workout_sessions')) {
        tables.workout_sessions.set(String(values[0]), {
          id: String(values[0]),
          routine_id: values[1],
          schedule_id: values[2],
          snapshot_name: values[3],
          start_time: values[4],
          end_time: values[5],
        });
      } else if (sql.startsWith('INSERT OR REPLACE INTO workout_sets')) {
        tables.workout_sets.set(String(values[0]), {
          id: String(values[0]),
          session_id: String(values[1]),
          exercise_id: String(values[2]),
          weight: values[3],
          reps: values[4],
          is_completed: values[5],
          target_sets: values[6],
          target_reps: values[7],
        });
      } else if (sql.startsWith('INSERT OR REPLACE INTO body_weight_entries')) {
        tables.body_weight_entries.set(String(values[0]), {
          id: String(values[0]),
          weight: values[1],
          unit: values[2],
          logged_at: values[3],
          notes: values[4],
        });
      }
    }),
    withTransactionSync: jest.fn((fn: () => void) => fn()),
  };
}

describe('seedDevelopmentDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('seeds a repeatable development dataset using the current exercise ids', () => {
    const db = createDevelopmentSeedDbMock();

    seedDevelopmentDatabase(db as SQLiteDatabase);
    seedDevelopmentDatabase(db as SQLiteDatabase);

    expect(mockSeedDefaultExercises).toHaveBeenCalledTimes(2);
    expect(db.withTransactionSync).toHaveBeenCalledTimes(2);

    const routines = db.runSync.mock.calls.filter(([sql]) =>
      String(sql).startsWith('INSERT OR REPLACE INTO routines'),
    );
    const schedules = db.runSync.mock.calls.filter(([sql]) =>
      String(sql).startsWith('INSERT OR REPLACE INTO schedules'),
    );
    const workoutSessions = db.runSync.mock.calls.filter(([sql]) =>
      String(sql).startsWith('INSERT OR REPLACE INTO workout_sessions'),
    );
    const workoutSets = db.runSync.mock.calls.filter(([sql]) =>
      String(sql).startsWith('INSERT OR REPLACE INTO workout_sets'),
    );
    const bodyWeightEntries = db.runSync.mock.calls.filter(([sql]) =>
      String(sql).startsWith('INSERT OR REPLACE INTO body_weight_entries'),
    );

    expect(routines).toHaveLength(developmentSeedData.routines.length * 2);
    expect(schedules).toHaveLength(developmentSeedData.schedules.length * 2);
    expect(workoutSessions).toHaveLength(
      developmentSeedData.workoutSessions.length * 2,
    );
    expect(workoutSets).toHaveLength(
      developmentSeedData.workoutSessions.reduce(
        (total, session) => total + session.sets.length,
        0,
      ) * 2,
    );
    expect(bodyWeightEntries).toHaveLength(
      developmentSeedData.bodyWeightEntries.length * 2,
    );
  });

  it('seeds the default exercise catalog before resolving required exercise ids', () => {
    const db = createDevelopmentSeedDbMock();

    seedDevelopmentDatabase(db as SQLiteDatabase);

    expect(mockSeedDefaultExercises).toHaveBeenCalledWith(db);
    expect(mockSeedDefaultExercises.mock.invocationCallOrder[0]).toBeLessThan(
      db.getAllSync.mock.invocationCallOrder[0],
    );
  });
});
