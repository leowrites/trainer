import type { SQLiteDatabase } from 'expo-sqlite';

import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';
import { generateId } from './utils';

interface UserVersionRow {
  user_version: number;
}

interface SqliteMasterRow {
  name: string;
}

interface TableInfoRow {
  name: string;
}

interface LegacyRoutineExerciseRow {
  id: string;
  target_reps: number;
  target_sets: number;
}

interface Migration {
  version: number;
  description: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Adopt explicit schema versioning for existing installs.',
    up: async () => {
      // Version 1 matched the bootstrap-created base schema.
    },
  },
  {
    version: 2,
    description: 'Advance the schema version without changing table layout.',
    up: async () => {
      // Version 2 only introduced the user_version pragma.
    },
  },
  {
    version: 3,
    description: 'Add persisted body-weight entries for offline tracking.',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS body_weight_entries (
          id        TEXT PRIMARY KEY NOT NULL,
          weight    REAL NOT NULL,
          unit      TEXT NOT NULL DEFAULT 'kg',
          logged_at INTEGER NOT NULL,
          notes     TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_body_weight_entries_logged_at
          ON body_weight_entries (logged_at);
      `);
    },
  },
  {
    version: 4,
    description: 'Persist workout set targets inside session snapshots.',
    up: async (db) => {
      if (!(await columnExists(db, 'workout_sets', 'target_sets'))) {
        await db.execAsync(
          'ALTER TABLE workout_sets ADD COLUMN target_sets INTEGER;',
        );
      }

      if (!(await columnExists(db, 'workout_sets', 'target_reps'))) {
        await db.execAsync(
          'ALTER TABLE workout_sets ADD COLUMN target_reps INTEGER;',
        );
      }
    },
  },
  {
    version: 5,
    description:
      'Add user profile settings and richer exercise metadata for phase 2.',
    up: async (db) => {
      if (!(await columnExists(db, 'exercises', 'how_to'))) {
        await db.execAsync('ALTER TABLE exercises ADD COLUMN how_to TEXT;');
      }

      if (!(await columnExists(db, 'exercises', 'equipment'))) {
        await db.execAsync('ALTER TABLE exercises ADD COLUMN equipment TEXT;');
      }

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_profile (
          id                    TEXT PRIMARY KEY NOT NULL,
          display_name          TEXT,
          preferred_weight_unit TEXT NOT NULL DEFAULT 'kg',
          created_at            INTEGER NOT NULL,
          updated_at            INTEGER NOT NULL
        );
      `);
    },
  },
  {
    version: 6,
    description:
      'Add soft deletion for exercises to preserve historical workout data.',
    up: async (db) => {
      if (!(await columnExists(db, 'exercises', 'is_deleted'))) {
        await db.execAsync(
          'ALTER TABLE exercises ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;',
        );
      }
    },
  },
  {
    version: 7,
    description: 'Add soft deletion for routines and schedules.',
    up: async (db) => {
      if (!(await columnExists(db, 'routines', 'is_deleted'))) {
        await db.execAsync(
          'ALTER TABLE routines ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;',
        );
      }

      if (!(await columnExists(db, 'schedules', 'is_deleted'))) {
        await db.execAsync(
          'ALTER TABLE schedules ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;',
        );
      }
    },
  },
  {
    version: 8,
    description:
      'Persist post-workout effort and fatigue scores on workout sessions.',
    up: async (db) => {
      if (!(await columnExists(db, 'workout_sessions', 'effort_level'))) {
        await db.execAsync(
          'ALTER TABLE workout_sessions ADD COLUMN effort_level INTEGER;',
        );
      }

      if (!(await columnExists(db, 'workout_sessions', 'fatigue_level'))) {
        await db.execAsync(
          'ALTER TABLE workout_sessions ADD COLUMN fatigue_level INTEGER;',
        );
      }
    },
  },
  {
    version: 9,
    description:
      'Add routine template sets, session exercise snapshots, explicit set positions, and template-apply tracking.',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS routine_exercise_sets (
          id                  TEXT PRIMARY KEY NOT NULL,
          routine_exercise_id TEXT NOT NULL,
          position            INTEGER NOT NULL,
          target_reps         INTEGER NOT NULL,
          planned_weight      REAL
        );

        CREATE INDEX IF NOT EXISTS idx_routine_exercise_sets_routine_exercise
          ON routine_exercise_sets (routine_exercise_id);

        CREATE TABLE IF NOT EXISTS workout_session_exercises (
          id           TEXT PRIMARY KEY NOT NULL,
          session_id   TEXT NOT NULL,
          exercise_id  TEXT NOT NULL,
          position     INTEGER NOT NULL,
          rest_seconds INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_session
          ON workout_session_exercises (session_id);
      `);

      if (!(await columnExists(db, 'routine_exercises', 'rest_seconds'))) {
        await db.execAsync(
          'ALTER TABLE routine_exercises ADD COLUMN rest_seconds INTEGER;',
        );
      }

      if (!(await columnExists(db, 'workout_sets', 'position'))) {
        await db.execAsync(
          'ALTER TABLE workout_sets ADD COLUMN position INTEGER;',
        );
      }

      if (
        !(await columnExists(db, 'workout_sessions', 'template_applied_at'))
      ) {
        await db.execAsync(
          'ALTER TABLE workout_sessions ADD COLUMN template_applied_at INTEGER;',
        );
      }

      const routineExerciseSetsCount = (
        await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) AS count FROM routine_exercise_sets',
        )
      )?.count;

      if ((routineExerciseSetsCount ?? 0) === 0) {
        const legacyRoutineExercises =
          await db.getAllAsync<LegacyRoutineExerciseRow>(
            `SELECT id, target_reps, target_sets
             FROM routine_exercises
             ORDER BY position ASC`,
          );

        for (const routineExercise of legacyRoutineExercises) {
          const setCount = Math.max(1, routineExercise.target_sets);

          for (let index = 0; index < setCount; index += 1) {
            await db.runAsync(
              `INSERT INTO routine_exercise_sets (
                id,
                routine_exercise_id,
                position,
                target_reps,
                planned_weight
              ) VALUES (?, ?, ?, ?, ?)`,
              [
                generateId(),
                routineExercise.id,
                index,
                routineExercise.target_reps,
                null,
              ],
            );
          }
        }
      }
    },
  },
  {
    version: 10,
    description:
      'Add deterministic intelligence columns for set roles, rep ranges, exercise capability flags, and typed goals.',
    up: async (db) => {
      if (!(await columnExists(db, 'exercises', 'strength_estimation_mode'))) {
        await db.execAsync(
          "ALTER TABLE exercises ADD COLUMN strength_estimation_mode TEXT NOT NULL DEFAULT 'limited';",
        );
      }

      if (
        !(await columnExists(db, 'routine_exercises', 'progression_policy'))
      ) {
        await db.execAsync(
          "ALTER TABLE routine_exercises ADD COLUMN progression_policy TEXT NOT NULL DEFAULT 'double_progression';",
        );
      }

      if (!(await columnExists(db, 'routine_exercises', 'target_rir'))) {
        await db.execAsync(
          'ALTER TABLE routine_exercises ADD COLUMN target_rir REAL;',
        );
      }

      if (
        !(await columnExists(db, 'routine_exercise_sets', 'target_reps_min'))
      ) {
        await db.execAsync(
          'ALTER TABLE routine_exercise_sets ADD COLUMN target_reps_min INTEGER;',
        );
      }

      if (
        !(await columnExists(db, 'routine_exercise_sets', 'target_reps_max'))
      ) {
        await db.execAsync(
          'ALTER TABLE routine_exercise_sets ADD COLUMN target_reps_max INTEGER;',
        );
      }

      if (!(await columnExists(db, 'routine_exercise_sets', 'set_role'))) {
        await db.execAsync(
          "ALTER TABLE routine_exercise_sets ADD COLUMN set_role TEXT NOT NULL DEFAULT 'work';",
        );
      }

      if (
        !(await columnExists(
          db,
          'workout_session_exercises',
          'progression_policy',
        ))
      ) {
        await db.execAsync(
          "ALTER TABLE workout_session_exercises ADD COLUMN progression_policy TEXT NOT NULL DEFAULT 'double_progression';",
        );
      }

      if (
        !(await columnExists(db, 'workout_session_exercises', 'target_rir'))
      ) {
        await db.execAsync(
          'ALTER TABLE workout_session_exercises ADD COLUMN target_rir REAL;',
        );
      }

      if (!(await columnExists(db, 'workout_sets', 'target_reps_min'))) {
        await db.execAsync(
          'ALTER TABLE workout_sets ADD COLUMN target_reps_min INTEGER;',
        );
      }

      if (!(await columnExists(db, 'workout_sets', 'target_reps_max'))) {
        await db.execAsync(
          'ALTER TABLE workout_sets ADD COLUMN target_reps_max INTEGER;',
        );
      }

      if (!(await columnExists(db, 'workout_sets', 'actual_rir'))) {
        await db.execAsync(
          'ALTER TABLE workout_sets ADD COLUMN actual_rir REAL;',
        );
      }

      if (!(await columnExists(db, 'workout_sets', 'set_role'))) {
        await db.execAsync(
          "ALTER TABLE workout_sets ADD COLUMN set_role TEXT NOT NULL DEFAULT 'work';",
        );
      }

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS training_goals (
          id TEXT PRIMARY KEY NOT NULL,
          goal_type TEXT NOT NULL,
          exercise_id TEXT,
          muscle_group TEXT,
          target_load REAL,
          target_reps INTEGER,
          target_sessions_per_week INTEGER,
          target_sets_per_week INTEGER,
          target_weeks INTEGER,
          start_time INTEGER,
          end_time INTEGER,
          status TEXT NOT NULL DEFAULT 'active',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_training_goals_status
          ON training_goals (status);
      `);

      await db.execAsync(`
        UPDATE routine_exercise_sets
        SET target_reps_min = COALESCE(target_reps_min, target_reps),
            target_reps_max = COALESCE(target_reps_max, target_reps)
      `);

      await db.execAsync(`
        UPDATE workout_sets
        SET target_reps_min = COALESCE(target_reps_min, target_reps),
            target_reps_max = COALESCE(target_reps_max, target_reps)
      `);
    },
  },
  {
    version: 11,
    description:
      'Add ordered-query indexes for schedules, routines, workout sessions, and session snapshots.',
    up: async (db) => {
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_schedule_entries_schedule_position
          ON schedule_entries (schedule_id, position);

        CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_position
          ON routine_exercises (routine_id, position);

        CREATE INDEX IF NOT EXISTS idx_workout_session_exercises_session_position
          ON workout_session_exercises (session_id, position);

        CREATE INDEX IF NOT EXISTS idx_workout_sets_session_position
          ON workout_sets (session_id, position);

        CREATE INDEX IF NOT EXISTS idx_workout_sessions_start_time_desc
          ON workout_sessions (start_time DESC);

        CREATE INDEX IF NOT EXISTS idx_workout_sessions_end_time_start_time
          ON workout_sessions (end_time, start_time DESC);
      `);
    },
  },
];

async function setUserVersion(
  db: SQLiteDatabase,
  version: number,
): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

async function tableExists(
  db: SQLiteDatabase,
  tableName: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<SqliteMasterRow>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName],
  );
  return row?.name === tableName;
}

async function columnExists(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const columns = await db.getAllAsync<TableInfoRow>(
    `PRAGMA table_info(${tableName})`,
  );
  return columns.some((column) => column.name === columnName);
}

export async function getUserVersion(db: SQLiteDatabase): Promise<number> {
  return (
    (await db.getFirstAsync<UserVersionRow>('PRAGMA user_version'))
      ?.user_version ?? 0
  );
}

async function hasTrainerTables(db: SQLiteDatabase): Promise<boolean> {
  return (
    (await tableExists(db, 'exercises')) ||
    (await tableExists(db, 'routines')) ||
    (await tableExists(db, 'schedules')) ||
    (await tableExists(db, 'workout_sessions')) ||
    (await tableExists(db, 'workout_sets')) ||
    (await tableExists(db, 'body_weight_entries'))
  );
}

export async function prepareDatabase(db: SQLiteDatabase): Promise<number> {
  const currentVersion = await getUserVersion(db);

  if (currentVersion > SCHEMA_VERSION) {
    console.warn(
      `[Database] Schema version ${currentVersion} is newer than supported version ${SCHEMA_VERSION}. Skipping migrations.`,
    );
    return currentVersion;
  }

  if (currentVersion === 0 && !(await hasTrainerTables(db))) {
    await db.execAsync(CREATE_TABLES_SQL);
    await setUserVersion(db, SCHEMA_VERSION);
    return SCHEMA_VERSION;
  }

  await db.execAsync(CREATE_TABLES_SQL);

  if (
    currentVersion === 0 &&
    (await tableExists(db, 'workout_sessions')) &&
    !(await columnExists(db, 'workout_sessions', 'schedule_id'))
  ) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(
        'ALTER TABLE workout_sessions ADD COLUMN schedule_id TEXT;',
      );
      await db.execAsync(
        'ALTER TABLE workout_sessions ADD COLUMN snapshot_name TEXT;',
      );
      await setUserVersion(db, 2);
    });
  }

  let migratedVersion = await getUserVersion(db);

  for (const migration of migrations) {
    if (migration.version <= migratedVersion) {
      continue;
    }

    console.warn(
      `[Database] Migrating schema from version ${migratedVersion} to ${migration.version}: ${migration.description}`,
    );

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await setUserVersion(db, migration.version);
    });

    migratedVersion = migration.version;
  }

  return migratedVersion;
}
