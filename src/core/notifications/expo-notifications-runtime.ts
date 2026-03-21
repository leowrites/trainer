/**
 * Expo notifications runtime adapter.
 *
 * CALLING SPEC:
 *   getExpoNotificationsRuntime() -> minimal local-notification API used by
 *   the workout timer service.
 *
 * Purpose:
 *   Avoid importing the top-level `expo-notifications` entrypoint at runtime,
 *   because it eagerly loads push-token modules that may be unavailable in the
 *   current binary even when local notifications are supported.
 */

interface NotificationResponseListener {
  remove: () => void;
}

interface ExpoNotificationsRuntime {
  setNotificationHandler: (handler: unknown) => void;
  getPermissionsAsync: () => Promise<unknown>;
  requestPermissionsAsync: (request: unknown) => Promise<unknown>;
  setNotificationChannelAsync: (
    channelId: string,
    config: unknown,
  ) => Promise<unknown>;
  addNotificationResponseReceivedListener: (
    listener: (response: unknown) => void,
  ) => NotificationResponseListener;
  getLastNotificationResponse: () => unknown;
  scheduleNotificationAsync: (request: unknown) => Promise<string>;
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
  getAllScheduledNotificationsAsync: () => Promise<
    Array<{ identifier: string }>
  >;
  AndroidNotificationPriority: { HIGH: string };
  SchedulableTriggerInputTypes: { TIME_INTERVAL: string };
  PermissionStatus: { UNDETERMINED: string };
  AndroidImportance: { HIGH: number };
  AndroidNotificationVisibility: { PUBLIC: number };
  IosAuthorizationStatus: {
    AUTHORIZED: number;
    PROVISIONAL: number;
    EPHEMERAL: number;
    NOT_DETERMINED: number;
  };
}

let cachedRuntime: ExpoNotificationsRuntime | null = null;

export function getExpoNotificationsRuntime(): ExpoNotificationsRuntime {
  if (cachedRuntime) {
    return cachedRuntime;
  }

  const notificationsHandler = require('expo-notifications/build/NotificationsHandler');
  const notificationPermissions = require('expo-notifications/build/NotificationPermissions');
  const notificationPermissionsTypes = require('expo-notifications/build/NotificationPermissions.types');
  const notificationChannel = require('expo-notifications/build/setNotificationChannelAsync');
  const notificationChannelTypes = require('expo-notifications/build/NotificationChannelManager.types');
  const notificationsEmitter = require('expo-notifications/build/NotificationsEmitter');
  const scheduleNotification = require('expo-notifications/build/scheduleNotificationAsync');
  const cancelScheduledNotification = require('expo-notifications/build/cancelScheduledNotificationAsync');
  const getAllScheduledNotifications = require('expo-notifications/build/getAllScheduledNotificationsAsync');
  const notificationTypes = require('expo-notifications/build/Notifications.types');

  cachedRuntime = {
    setNotificationHandler: notificationsHandler.setNotificationHandler,
    getPermissionsAsync: notificationPermissions.getPermissionsAsync,
    requestPermissionsAsync: notificationPermissions.requestPermissionsAsync,
    setNotificationChannelAsync:
      notificationChannel.setNotificationChannelAsync,
    addNotificationResponseReceivedListener:
      notificationsEmitter.addNotificationResponseReceivedListener,
    getLastNotificationResponse:
      notificationsEmitter.getLastNotificationResponse,
    scheduleNotificationAsync: scheduleNotification.scheduleNotificationAsync,
    cancelScheduledNotificationAsync:
      cancelScheduledNotification.cancelScheduledNotificationAsync,
    getAllScheduledNotificationsAsync:
      getAllScheduledNotifications.getAllScheduledNotificationsAsync,
    AndroidNotificationPriority: notificationTypes.AndroidNotificationPriority,
    SchedulableTriggerInputTypes:
      notificationTypes.SchedulableTriggerInputTypes,
    PermissionStatus: notificationTypes.PermissionStatus,
    AndroidImportance: notificationChannelTypes.AndroidImportance,
    AndroidNotificationVisibility:
      notificationChannelTypes.AndroidNotificationVisibility,
    IosAuthorizationStatus: notificationPermissionsTypes.IosAuthorizationStatus,
  };

  return cachedRuntime;
}
