/**
 * Workout Mode feature slice
 *
 * Provides the real-time workout logging experience: timer, set tracking,
 * rest countdowns, and progressive-overload suggestions during an active session.
 */
export { useWorkoutStore } from './store';
export {
  useActiveWorkoutActions,
  useEnsureActiveWorkoutLoaded,
} from './hooks/use-active-workout';
export {
  useActiveWorkoutExerciseIds,
  useActiveWorkoutHeaderState,
  useActiveWorkoutInitialFocusedSetId,
  useActiveWorkoutOverview,
  useActiveWorkoutSetIds,
  useActiveWorkoutSessionMeta,
  useActiveWorkoutSetSceneState,
  useActiveWorkoutSummary,
  useActiveWorkoutVisibility,
  useExerciseTimerState,
} from './hooks/use-active-workout-state';
export { useWorkoutStarter } from './hooks/use-workout-starter';
export {
  loadInProgressWorkoutSession,
  loadLatestInProgressWorkoutSession,
} from './session-repository';
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
