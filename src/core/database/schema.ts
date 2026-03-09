import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * WatermelonDB schema — version 1
 *
 * Defines the SQLite tables for all core entities. Increment the version
 * number and add a migration whenever the schema changes.
 */
export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'exercises',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'muscle_group', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'routines',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'routine_exercises',
      columns: [
        { name: 'routine_id', type: 'string', isIndexed: true },
        { name: 'exercise_id', type: 'string', isIndexed: true },
        { name: 'target_sets', type: 'number' },
        { name: 'target_reps', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'workout_sessions',
      columns: [
        { name: 'routine_id', type: 'string', isIndexed: true },
        { name: 'start_time', type: 'number' },
        { name: 'end_time', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'workout_sets',
      columns: [
        { name: 'session_id', type: 'string', isIndexed: true },
        { name: 'exercise_id', type: 'string', isIndexed: true },
        { name: 'weight', type: 'number' },
        { name: 'reps', type: 'number' },
        { name: 'is_completed', type: 'boolean' },
      ],
    }),
  ],
});
