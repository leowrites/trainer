/**
 * Workout Mode feature slice
 *
 * Provides the real-time workout logging experience: timer, set tracking,
 * rest countdowns, and progressive-overload suggestions during an active session.
 */
export { useWorkoutStore } from './store';
export { useActiveWorkout } from './hooks/use-active-workout';
export { useWorkoutStarter } from './hooks/use-workout-starter';
export {
  WorkoutActiveScreen,
  WorkoutScreen,
  WorkoutSummaryScreen,
} from './screens/workout-screen';
export type {
  ActiveWorkoutExercise,
  ActiveWorkoutSession,
  ActiveWorkoutSet,
} from './types';
export type {
  WorkoutFeedbackMetric,
  WorkoutRecordBadge,
  WorkoutSummaryViewModel,
} from './summary-types';
