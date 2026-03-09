/**
 * Database core module
 *
 * Central WatermelonDB setup. All models are registered here and the database
 * instance is provided to the rest of the app via a React context / custom hook.
 * Never import this module directly inside a React component — use useDatabase().
 */
export { database } from './database';
export {
  Exercise,
  Routine,
  RoutineExercise,
  WorkoutSession,
  WorkoutSet,
} from './models';
export { schema } from './schema';
export { DatabaseProvider, useDatabase } from './provider';
