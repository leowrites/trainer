/**
 * Workout Mode feature slice
 *
 * Provides the real-time workout logging experience: timer, set tracking,
 * rest countdowns, and progressive-overload suggestions during an active session.
 */
export { useWorkoutStore } from './store';
export { useWorkoutStarter } from './hooks/use-workout-starter';
export { useWorkoutSession } from './hooks/use-workout-session';
export type {
  ExerciseGroup,
  AddSetInput,
  UpdateSetInput,
} from './hooks/use-workout-session';
export { WorkoutScreen } from './screens/workout-screen';
