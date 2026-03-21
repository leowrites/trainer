/**
 * Database core module
 *
 * Central expo-sqlite setup. The database instance is provided to the rest
 * of the app via a React context / custom hook.
 * Never import this module directly inside a React component — use useDatabase().
 */
export { database } from './database';
export type {
  BodyWeightEntry,
  Exercise,
  Routine,
  RoutineExercise,
  RoutineExerciseSet,
  Schedule,
  ScheduleEntry,
  UserProfile,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
} from './types';
export { DatabaseProvider, useDatabase } from './provider';
export { seedDevelopmentDatabase } from './seed-development';
export { seedDefaultExercises } from './seed-exercises';
export { generateId } from './utils';
