/**
 * Workout timer notification service.
 *
 * CALLING SPEC:
 *   await ensureWorkoutTimerNotificationsReadyAsync() -> 'ready' | 'unsupported' | 'error'
 *   await ensureWorkoutTimerNotificationPermissionAsync() -> permission status
 *   await scheduleWorkoutTimerNotificationAsync(request) -> schedule status
 *   await cancelWorkoutTimerNotificationAsync(key) -> void
 *   await cancelAllWorkoutTimerNotificationsAsync() -> void
 *   addWorkoutTimerNotificationResponseListener(listener) -> unsubscribe fn
 *   getLastWorkoutTimerNotificationResponseData() -> notification data | null
 *
 * Side effects:
 *   Configures the OS notification handler/channel and schedules or cancels
 *   local notifications through expo-notifications.
 */

import { Platform } from 'react-native';
import type {
  NotificationPermissionsStatus,
  NotificationResponse,
} from 'expo-notifications';

import type {
  WorkoutTimerNotificationData,
  WorkoutTimerNotificationPermissionStatus,
  WorkoutTimerNotificationRequest,
  WorkoutTimerNotificationScheduleStatus,
} from './types';
import { getExpoNotificationsRuntime } from './expo-notifications-runtime';

const WORKOUT_TIMER_CHANNEL_ID = 'workout-timers';
const WORKOUT_TIMER_IDENTIFIER_PREFIX = 'workout-timer:';
const WORKOUT_TIMER_VIBRATION_PATTERN = [0, 250, 250, 250];

let hasConfiguredNotifications = false;
let hasRequestedPermission = false;

function isUnsupportedPlatform(): boolean {
  return Platform.OS === 'web';
}

function buildNotificationIdentifier(key: string): string {
  return `${WORKOUT_TIMER_IDENTIFIER_PREFIX}${key}`;
}

function isWorkoutTimerNotificationData(
  value: unknown,
): value is WorkoutTimerNotificationData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const isExerciseKind =
    record.kind === 'exercise' &&
    (record.exerciseId === undefined || typeof record.exerciseId === 'string');

  return (
    record.notificationType === 'workout-timer' &&
    typeof record.sessionId === 'string' &&
    (record.kind === 'rest' || isExerciseKind)
  );
}

function extractWorkoutTimerNotificationData(
  value: unknown,
): WorkoutTimerNotificationData | null {
  return isWorkoutTimerNotificationData(value) ? value : null;
}

function normalizePermissionStatus(
  settings: NotificationPermissionsStatus,
): WorkoutTimerNotificationPermissionStatus {
  const Notifications = getExpoNotificationsRuntime();

  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'granted';
  }

  if (
    settings.status === Notifications.PermissionStatus.UNDETERMINED ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.NOT_DETERMINED
  ) {
    return 'undetermined';
  }

  return 'denied';
}

async function getNotificationPermissionStatusAsync(): Promise<WorkoutTimerNotificationPermissionStatus> {
  if (isUnsupportedPlatform()) {
    return 'unsupported';
  }

  try {
    const Notifications = getExpoNotificationsRuntime();
    const settings =
      (await Notifications.getPermissionsAsync()) as NotificationPermissionsStatus;
    return normalizePermissionStatus(settings);
  } catch {
    return 'unsupported';
  }
}

export async function ensureWorkoutTimerNotificationsReadyAsync(): Promise<
  'ready' | 'unsupported' | 'error'
> {
  if (isUnsupportedPlatform()) {
    return 'unsupported';
  }

  if (hasConfiguredNotifications) {
    return 'ready';
  }

  try {
    const Notifications = getExpoNotificationsRuntime();

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        WORKOUT_TIMER_CHANNEL_ID,
        {
          name: 'Workout timers',
          importance: Notifications.AndroidImportance.HIGH,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: WORKOUT_TIMER_VIBRATION_PATTERN,
          enableVibrate: true,
          showBadge: false,
          sound: 'default',
        },
      );
    }

    hasConfiguredNotifications = true;
    return 'ready';
  } catch {
    return 'error';
  }
}

export async function ensureWorkoutTimerNotificationPermissionAsync(): Promise<WorkoutTimerNotificationPermissionStatus> {
  const readiness = await ensureWorkoutTimerNotificationsReadyAsync();
  if (readiness !== 'ready') {
    return readiness === 'unsupported' ? 'unsupported' : 'denied';
  }

  const currentStatus = await getNotificationPermissionStatusAsync();
  if (currentStatus === 'granted' || currentStatus === 'denied') {
    return currentStatus;
  }

  if (currentStatus === 'unsupported') {
    return 'unsupported';
  }

  if (hasRequestedPermission) {
    return 'denied';
  }

  hasRequestedPermission = true;

  try {
    const Notifications = getExpoNotificationsRuntime();
    const settings = (await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    })) as NotificationPermissionsStatus;
    return normalizePermissionStatus(settings);
  } catch {
    return 'denied';
  }
}

export async function scheduleWorkoutTimerNotificationAsync(
  request: WorkoutTimerNotificationRequest,
): Promise<WorkoutTimerNotificationScheduleStatus> {
  const Notifications = getExpoNotificationsRuntime();
  const permissionStatus =
    await ensureWorkoutTimerNotificationPermissionAsync();
  if (permissionStatus === 'unsupported') {
    return 'unsupported';
  }

  if (permissionStatus !== 'granted') {
    return 'skipped';
  }

  const identifier = buildNotificationIdentifier(request.key);
  const secondsUntilTrigger = Math.max(
    1,
    Math.ceil((request.triggerAt - Date.now()) / 1000),
  );

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: request.title,
        body: request.body,
        data: request.data,
        sound: 'default',
        vibrate: WORKOUT_TIMER_VIBRATION_PATTERN,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        autoDismiss: true,
        interruptionLevel: 'active',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilTrigger,
        channelId:
          Platform.OS === 'android' ? WORKOUT_TIMER_CHANNEL_ID : undefined,
      },
    });
    return 'scheduled';
  } catch {
    return 'error';
  }
}

export async function cancelWorkoutTimerNotificationAsync(
  key: string,
): Promise<void> {
  if (isUnsupportedPlatform()) {
    return;
  }

  try {
    const Notifications = getExpoNotificationsRuntime();
    await Notifications.cancelScheduledNotificationAsync(
      buildNotificationIdentifier(key),
    );
  } catch {
    // Timer behavior should continue even if OS cancellation fails.
  }
}

export async function cancelAllWorkoutTimerNotificationsAsync(): Promise<void> {
  if (isUnsupportedPlatform()) {
    return;
  }

  try {
    const Notifications = getExpoNotificationsRuntime();
    const requests = await Notifications.getAllScheduledNotificationsAsync();
    const workoutTimerRequests = requests.filter((request) =>
      request.identifier.startsWith(WORKOUT_TIMER_IDENTIFIER_PREFIX),
    );

    await Promise.all(
      workoutTimerRequests.map((request) =>
        Notifications.cancelScheduledNotificationAsync(request.identifier),
      ),
    );
  } catch {
    // Timer behavior should continue even if OS cancellation fails.
  }
}

export function getLastWorkoutTimerNotificationResponseData(): WorkoutTimerNotificationData | null {
  if (isUnsupportedPlatform()) {
    return null;
  }

  try {
    const Notifications = getExpoNotificationsRuntime();
    const response =
      Notifications.getLastNotificationResponse() as NotificationResponse | null;
    return extractWorkoutTimerNotificationData(
      response?.notification.request.content.data,
    );
  } catch {
    return null;
  }
}

export function addWorkoutTimerNotificationResponseListener(
  listener: (data: WorkoutTimerNotificationData) => void,
): () => void {
  if (isUnsupportedPlatform()) {
    return () => undefined;
  }

  try {
    const Notifications = getExpoNotificationsRuntime();
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const notificationResponse = response as NotificationResponse;
        const data = extractWorkoutTimerNotificationData(
          notificationResponse.notification.request.content.data,
        );

        if (data) {
          listener(data);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  } catch {
    return () => undefined;
  }
}
