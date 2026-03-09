/**
 * Database core module
 *
 * Central expo-sqlite setup. The database instance is provided to the rest
 * of the app via a React context / custom hook.
 * Never import this module directly inside a React component — use useDatabase().
 */
export { database } from './database';
export type {
  Exercise,
  Routine,
  RoutineExercise,
  Schedule,
  ScheduleEntry,
  WorkoutSession,
  WorkoutSet,
} from './types';
export { DatabaseProvider, useDatabase } from './provider';
export { seedDefaultExercises } from './seed-exercises';
export { generateId } from './utils';
