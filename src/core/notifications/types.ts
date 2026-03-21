/**
 * Workout timer notification types.
 *
 * CALLING SPEC:
 *   Use these types when scheduling or handling workout timer notifications.
 *
 *   WorkoutTimerNotificationRequest:
 *     Input for scheduling one logical timer alert.
 *
 *   WorkoutTimerNotificationData:
 *     Payload stored in the notification so app-level listeners can identify
 *     workout timer alerts and route taps back into the active workout flow.
 */

export type WorkoutTimerNotificationKind = 'rest' | 'exercise';

export interface WorkoutTimerNotificationData extends Record<string, unknown> {
  notificationType: 'workout-timer';
  kind: WorkoutTimerNotificationKind;
  sessionId: string;
  exerciseId?: string;
}

export interface WorkoutTimerNotificationRequest {
  key: string;
  title: string;
  body: string;
  triggerAt: number;
  data: WorkoutTimerNotificationData;
}

export type WorkoutTimerNotificationPermissionStatus =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unsupported';

export type WorkoutTimerNotificationScheduleStatus =
  | 'scheduled'
  | 'skipped'
  | 'unsupported'
  | 'error';
