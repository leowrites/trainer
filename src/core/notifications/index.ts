/**
 * Notifications core module.
 *
 * CALLING SPEC:
 *   Import the coordinator for app bootstrap and the service helpers for tests
 *   or app-level integrations.
 */

export { WorkoutTimerNotificationCoordinator } from './workout-timer-notification-coordinator';
export {
  addWorkoutTimerNotificationResponseListener,
  cancelAllWorkoutTimerNotificationsAsync,
  cancelWorkoutTimerNotificationAsync,
  ensureWorkoutTimerNotificationPermissionAsync,
  ensureWorkoutTimerNotificationsReadyAsync,
  getLastWorkoutTimerNotificationResponseData,
  scheduleWorkoutTimerNotificationAsync,
} from './workout-timer-notifications';
export type {
  WorkoutTimerNotificationData,
  WorkoutTimerNotificationKind,
  WorkoutTimerNotificationPermissionStatus,
  WorkoutTimerNotificationRequest,
  WorkoutTimerNotificationScheduleStatus,
} from './types';
