/**
 * Health Tracking feature slice
 *
 * Tracks body weight, daily step counts, and other physical activities
 * to provide a holistic picture of the user's fitness journey.
 */
export { HealthScreen } from './screens/health-screen';
export { useHealthTracking } from './hooks/use-health-tracking';
export type { UseHealthTrackingReturn } from './hooks/use-health-tracking';
export type {
  NewBodyWeightInput,
  UpdateBodyWeightInput,
  NewStepCountInput,
  UpdateStepCountInput,
  NewActivityInput,
  UpdateActivityInput,
} from './types';
