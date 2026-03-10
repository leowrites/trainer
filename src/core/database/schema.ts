/**
 * Database schema — SQL CREATE TABLE statements.
 *
 * Each table uses a TEXT primary key `id` (UUID) to match the previous
 * WatermelonDB behaviour. Add new tables or columns here and bump the
 * user_version pragma in database.ts when the schema changes.
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS exercises (
    id   TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS routines (
    id    TEXT PRIMARY KEY NOT NULL,
    name  TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS routine_exercises (
    id          TEXT PRIMARY KEY NOT NULL,
    routine_id  TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position    INTEGER NOT NULL,
    target_sets INTEGER NOT NULL,
    target_reps INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine
    ON routine_exercises (routine_id);
  CREATE INDEX IF NOT EXISTS idx_routine_exercises_exercise
    ON routine_exercises (exercise_id);

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id         TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT,
    start_time INTEGER NOT NULL,
    end_time   INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_workout_sessions_routine
    ON workout_sessions (routine_id);

  CREATE TABLE IF NOT EXISTS workout_sets (
    id           TEXT PRIMARY KEY NOT NULL,
    session_id   TEXT NOT NULL,
    exercise_id  TEXT NOT NULL,
    weight       REAL NOT NULL,
    reps         INTEGER NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_workout_sets_session
    ON workout_sets (session_id);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise
    ON workout_sets (exercise_id);
`;
