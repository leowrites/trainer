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
  up: (db: SQLiteDatabase) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Adopt explicit schema versioning for existing installs.',
    up: () => {
      // Version 1 matched the bootstrap-created base schema.
    },
  },
  {
    version: 2,
    description: 'Advance the schema version without changing table layout.',
    up: () => {
      // Version 2 only introduced the user_version pragma.
    },
  },
  {
    version: 3,
    description: 'Add persisted body-weight entries for offline tracking.',
    up: (db) => {
      db.execSync(`
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
    up: (db) => {
      if (!columnExists(db, 'workout_sets', 'target_sets')) {
        db.execSync('ALTER TABLE workout_sets ADD COLUMN target_sets INTEGER;');
      }

      if (!columnExists(db, 'workout_sets', 'target_reps')) {
        db.execSync('ALTER TABLE workout_sets ADD COLUMN target_reps INTEGER;');
      }
    },
  },
  {
    version: 5,
    description:
      'Add user profile settings and richer exercise metadata for phase 2.',
    up: (db) => {
      if (!columnExists(db, 'exercises', 'how_to')) {
        db.execSync('ALTER TABLE exercises ADD COLUMN how_to TEXT;');
      }

      if (!columnExists(db, 'exercises', 'equipment')) {
        db.execSync('ALTER TABLE exercises ADD COLUMN equipment TEXT;');
      }

      db.execSync(`
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
    up: (db) => {
      if (!columnExists(db, 'exercises', 'is_deleted')) {
        db.execSync(
          'ALTER TABLE exercises ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;',
        );
      }
    },
  },
  {
    version: 7,
    description: 'Add soft deletion for routines and schedules.',
    up: (db) => {
      if (!columnExists(db, 'routines', 'is_deleted')) {
        db.execSync(
          'ALTER TABLE routines ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;',
        );
      }

      if (!columnExists(db, 'schedules', 'is_deleted')) {
        db.execSync(
          'ALTER TABLE schedules ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;',
        );
      }
    },
  },
  {
    version: 8,
    description:
      'Persist post-workout effort and fatigue scores on workout sessions.',
    up: (db) => {
      if (!columnExists(db, 'workout_sessions', 'effort_level')) {
        db.execSync(
          'ALTER TABLE workout_sessions ADD COLUMN effort_level INTEGER;',
        );
      }

      if (!columnExists(db, 'workout_sessions', 'fatigue_level')) {
        db.execSync(
          'ALTER TABLE workout_sessions ADD COLUMN fatigue_level INTEGER;',
        );
      }
    },
  },
  {
    version: 9,
    description:
      'Add routine template sets, session exercise snapshots, explicit set positions, and template-apply tracking.',
    up: (db) => {
      db.execSync(`
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

      if (!columnExists(db, 'routine_exercises', 'rest_seconds')) {
        db.execSync(
          'ALTER TABLE routine_exercises ADD COLUMN rest_seconds INTEGER;',
        );
      }

      if (!columnExists(db, 'workout_sets', 'position')) {
        db.execSync('ALTER TABLE workout_sets ADD COLUMN position INTEGER;');
      }

      if (!columnExists(db, 'workout_sessions', 'template_applied_at')) {
        db.execSync(
          'ALTER TABLE workout_sessions ADD COLUMN template_applied_at INTEGER;',
        );
      }

      const routineExerciseSetsCount = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM routine_exercise_sets',
      )?.count;

      if ((routineExerciseSetsCount ?? 0) === 0) {
        const legacyRoutineExercises = db.getAllSync<LegacyRoutineExerciseRow>(
          `SELECT id, target_reps, target_sets
           FROM routine_exercises
           ORDER BY position ASC`,
        );

        for (const routineExercise of legacyRoutineExercises) {
          const setCount = Math.max(1, routineExercise.target_sets);

          for (let index = 0; index < setCount; index += 1) {
            db.runSync(
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
    up: (db) => {
      if (!columnExists(db, 'exercises', 'strength_estimation_mode')) {
        db.execSync(
          "ALTER TABLE exercises ADD COLUMN strength_estimation_mode TEXT NOT NULL DEFAULT 'limited';",
        );
      }

      if (!columnExists(db, 'routine_exercises', 'progression_policy')) {
        db.execSync(
          "ALTER TABLE routine_exercises ADD COLUMN progression_policy TEXT NOT NULL DEFAULT 'double_progression';",
        );
      }

      if (!columnExists(db, 'routine_exercises', 'target_rir')) {
        db.execSync(
          'ALTER TABLE routine_exercises ADD COLUMN target_rir REAL;',
        );
      }

      if (!columnExists(db, 'routine_exercise_sets', 'target_reps_min')) {
        db.execSync(
          'ALTER TABLE routine_exercise_sets ADD COLUMN target_reps_min INTEGER;',
        );
      }

      if (!columnExists(db, 'routine_exercise_sets', 'target_reps_max')) {
        db.execSync(
          'ALTER TABLE routine_exercise_sets ADD COLUMN target_reps_max INTEGER;',
        );
      }

      if (!columnExists(db, 'routine_exercise_sets', 'set_role')) {
        db.execSync(
          "ALTER TABLE routine_exercise_sets ADD COLUMN set_role TEXT NOT NULL DEFAULT 'work';",
        );
      }

      if (
        !columnExists(db, 'workout_session_exercises', 'progression_policy')
      ) {
        db.execSync(
          "ALTER TABLE workout_session_exercises ADD COLUMN progression_policy TEXT NOT NULL DEFAULT 'double_progression';",
        );
      }

      if (!columnExists(db, 'workout_session_exercises', 'target_rir')) {
        db.execSync(
          'ALTER TABLE workout_session_exercises ADD COLUMN target_rir REAL;',
        );
      }

      if (!columnExists(db, 'workout_sets', 'target_reps_min')) {
        db.execSync(
          'ALTER TABLE workout_sets ADD COLUMN target_reps_min INTEGER;',
        );
      }

      if (!columnExists(db, 'workout_sets', 'target_reps_max')) {
        db.execSync(
          'ALTER TABLE workout_sets ADD COLUMN target_reps_max INTEGER;',
        );
      }

      if (!columnExists(db, 'workout_sets', 'actual_rir')) {
        db.execSync('ALTER TABLE workout_sets ADD COLUMN actual_rir REAL;');
      }

      if (!columnExists(db, 'workout_sets', 'set_role')) {
        db.execSync(
          "ALTER TABLE workout_sets ADD COLUMN set_role TEXT NOT NULL DEFAULT 'work';",
        );
      }

      db.execSync(`
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

      db.execSync(`
        UPDATE routine_exercise_sets
        SET target_reps_min = COALESCE(target_reps_min, target_reps),
            target_reps_max = COALESCE(target_reps_max, target_reps)
      `);

      db.execSync(`
        UPDATE workout_sets
        SET target_reps_min = COALESCE(target_reps_min, target_reps),
            target_reps_max = COALESCE(target_reps_max, target_reps)
      `);
    },
  },
];

function setUserVersion(db: SQLiteDatabase, version: number): void {
  db.execSync(`PRAGMA user_version = ${version}`);
}

function tableExists(db: SQLiteDatabase, tableName: string): boolean {
  const row = db.getFirstSync<SqliteMasterRow>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName],
  );
  return row?.name === tableName;
}

function columnExists(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
): boolean {
  const columns = db.getAllSync<TableInfoRow>(
    `PRAGMA table_info(${tableName})`,
  );
  return columns.some((column) => column.name === columnName);
}

export function getUserVersion(db: SQLiteDatabase): number {
  return (
    db.getFirstSync<UserVersionRow>('PRAGMA user_version')?.user_version ?? 0
  );
}

function hasTrainerTables(db: SQLiteDatabase): boolean {
  return (
    tableExists(db, 'exercises') ||
    tableExists(db, 'routines') ||
    tableExists(db, 'schedules') ||
    tableExists(db, 'workout_sessions') ||
    tableExists(db, 'workout_sets') ||
    tableExists(db, 'body_weight_entries')
  );
}

export function prepareDatabase(db: SQLiteDatabase): number {
  const currentVersion = getUserVersion(db);

  if (currentVersion > SCHEMA_VERSION) {
    console.warn(
      `[Database] Schema version ${currentVersion} is newer than supported version ${SCHEMA_VERSION}. Skipping migrations.`,
    );
    return currentVersion;
  }

  if (currentVersion === 0 && !hasTrainerTables(db)) {
    db.execSync(CREATE_TABLES_SQL);
    setUserVersion(db, SCHEMA_VERSION);
    return SCHEMA_VERSION;
  }

  db.execSync(CREATE_TABLES_SQL);

  if (
    currentVersion === 0 &&
    tableExists(db, 'workout_sessions') &&
    !columnExists(db, 'workout_sessions', 'schedule_id')
  ) {
    db.withTransactionSync(() => {
      db.execSync('ALTER TABLE workout_sessions ADD COLUMN schedule_id TEXT;');
      db.execSync(
        'ALTER TABLE workout_sessions ADD COLUMN snapshot_name TEXT;',
      );
      setUserVersion(db, 2);
    });
  }

  let migratedVersion = getUserVersion(db);

  for (const migration of migrations) {
    if (migration.version <= migratedVersion) {
      continue;
    }

    console.warn(
      `[Database] Migrating schema from version ${migratedVersion} to ${migration.version}: ${migration.description}`,
    );

    db.withTransactionSync(() => {
      migration.up(db);
      setUserVersion(db, migration.version);
    });

    migratedVersion = migration.version;
  }

  return migratedVersion;
}
