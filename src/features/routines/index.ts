/**
 * Routines feature slice
 *
 * Handles creation and management of workout routines — named collections of
 * exercises that users perform together. Each routine belongs to one or more
 * Schedules and can be queued automatically by the Schedule Engine.
 */
export { RoutinesScreen } from './screens/routines-screen';
export { ExerciseDetailScreen } from './screens/exercise-detail-screen';
export type { ExerciseDetailScreenProps } from './screens/exercise-detail-screen';
export { useExercises } from './hooks/use-exercises';
export { useRoutines } from './hooks/use-routines';
export type {
  NewRoutineInput,
  RoutineExerciseInput,
} from './hooks/use-routines';
export { buildRoutineSnapshot } from './domain/routine-snapshot';
export type {
  RoutineExerciseData,
  WorkoutSnapshotInput,
} from './domain/routine-snapshot';
