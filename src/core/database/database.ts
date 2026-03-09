import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import {
  Exercise,
  Routine,
  RoutineExercise,
  WorkoutSession,
  WorkoutSet,
} from './models';

const adapter = new SQLiteAdapter({
  schema,
  // TODO: Add migrations array when schema changes (see WatermelonDB migration docs).
  // Until then the database is dropped and recreated on schema version bump.
  migrations: undefined,
  jsi: true,
  onSetUpError: (error) => {
    console.error('[Database] Setup error:', error);
  },
});

/**
 * Singleton WatermelonDB instance.
 * Import via `@core/database` — never import this file directly in components.
 */
export const database = new Database({
  adapter,
  modelClasses: [
    Exercise,
    Routine,
    RoutineExercise,
    WorkoutSession,
    WorkoutSet,
  ],
});
