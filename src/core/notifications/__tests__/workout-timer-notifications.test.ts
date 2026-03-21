import { Platform } from 'react-native';
import type { NotificationPermissionsStatus } from 'expo-notifications';

type WorkoutTimerNotificationsModule = {
  ensureWorkoutTimerNotificationsReadyAsync: () => Promise<
    'ready' | 'unsupported' | 'error'
  >;
  scheduleWorkoutTimerNotificationAsync: (request: {
    key: string;
    title: string;
    body: string;
    triggerAt: number;
    data: Record<string, unknown>;
  }) => Promise<'scheduled' | 'skipped' | 'unsupported' | 'error'>;
  cancelAllWorkoutTimerNotificationsAsync: () => Promise<void>;
};

const mockRuntime = {
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  getLastNotificationResponse: jest.fn(),
  AndroidNotificationPriority: { HIGH: 'high' },
  AndroidImportance: { HIGH: 6 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
};

jest.mock('../expo-notifications-runtime', () => ({
  getExpoNotificationsRuntime: () => mockRuntime,
}));

function grantedPermissions(): NotificationPermissionsStatus {
  return {
    status: 'granted' as NotificationPermissionsStatus['status'],
    granted: true,
    canAskAgain: true,
    expires: 'never',
    ios: {
      status: 2,
      allowsAlert: true,
      allowsBadge: false,
      allowsSound: true,
      allowsAnnouncements: false,
      allowsCriticalAlerts: false,
      allowsDisplayInCarPlay: true,
      allowsDisplayInNotificationCenter: true,
      allowsDisplayOnLockScreen: true,
      alertStyle: 1,
      allowsPreviews: 1,
      providesAppNotificationSettings: false,
    },
  };
}

async function loadNotificationsModule(): Promise<WorkoutTimerNotificationsModule> {
  jest.resetModules();
  return require('../workout-timer-notifications') as WorkoutTimerNotificationsModule;
}

describe('workout-timer-notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRuntime.setNotificationChannelAsync.mockResolvedValue(null);
    mockRuntime.getPermissionsAsync.mockResolvedValue(grantedPermissions());
    mockRuntime.requestPermissionsAsync.mockResolvedValue(grantedPermissions());
    mockRuntime.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockRuntime.scheduleNotificationAsync.mockResolvedValue('notification-id');
    mockRuntime.getAllScheduledNotificationsAsync.mockResolvedValue([]);
    mockRuntime.addNotificationResponseReceivedListener.mockReturnValue({
      remove: jest.fn(),
    });
    mockRuntime.getLastNotificationResponse.mockReturnValue(null);
  });

  it('configures the handler and Android channel only once', async () => {
    const notifications = await loadNotificationsModule();

    await notifications.ensureWorkoutTimerNotificationsReadyAsync();
    await notifications.ensureWorkoutTimerNotificationsReadyAsync();

    expect(mockRuntime.setNotificationHandler).toHaveBeenCalledTimes(1);
    if (Platform.OS === 'android') {
      expect(mockRuntime.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
      expect(mockRuntime.setNotificationChannelAsync).toHaveBeenCalledWith(
        'workout-timers',
        expect.objectContaining({
          name: 'Workout timers',
          importance: 6,
          showBadge: false,
        }),
      );
    } else {
      expect(mockRuntime.setNotificationChannelAsync).not.toHaveBeenCalled();
    }
  });

  it('schedules rest and exercise timer alerts with stable identifiers', async () => {
    const notifications = await loadNotificationsModule();

    await notifications.scheduleWorkoutTimerNotificationAsync({
      key: 'rest',
      title: 'Rest timer finished',
      body: 'Time for your next set.',
      triggerAt: Date.now() + 30_000,
      data: {
        notificationType: 'workout-timer',
        kind: 'rest',
        sessionId: 'session-1',
      },
    });
    await notifications.scheduleWorkoutTimerNotificationAsync({
      key: 'exercise:exercise-1',
      title: 'Bench Press timer finished',
      body: 'Your timer has ended.',
      triggerAt: Date.now() + 45_000,
      data: {
        notificationType: 'workout-timer',
        kind: 'exercise',
        sessionId: 'session-1',
        exerciseId: 'exercise-1',
      },
    });

    expect(mockRuntime.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'workout-timer:rest',
    );
    expect(mockRuntime.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'workout-timer:exercise:exercise-1',
    );
    expect(mockRuntime.scheduleNotificationAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identifier: 'workout-timer:rest',
        content: expect.objectContaining({
          title: 'Rest timer finished',
          body: 'Time for your next set.',
        }),
      }),
    );
    expect(mockRuntime.scheduleNotificationAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        identifier: 'workout-timer:exercise:exercise-1',
        content: expect.objectContaining({
          title: 'Bench Press timer finished',
          body: 'Your timer has ended.',
          data: expect.objectContaining({
            exerciseId: 'exercise-1',
          }),
        }),
      }),
    );
  });

  it('requests permission only on the first undetermined schedule attempt', async () => {
    mockRuntime.getPermissionsAsync.mockResolvedValue({
      status: 'undetermined' as NotificationPermissionsStatus['status'],
      granted: false,
      canAskAgain: true,
      expires: 'never',
      ios: {
        status: 0,
        allowsAlert: null,
        allowsBadge: null,
        allowsSound: null,
        allowsAnnouncements: null,
        allowsCriticalAlerts: null,
        allowsDisplayInCarPlay: null,
        allowsDisplayInNotificationCenter: null,
        allowsDisplayOnLockScreen: null,
        alertStyle: 0,
        allowsPreviews: null,
        providesAppNotificationSettings: null,
      },
    });
    mockRuntime.requestPermissionsAsync.mockResolvedValue({
      ...grantedPermissions(),
      status: 'denied' as NotificationPermissionsStatus['status'],
      granted: false,
      ios: {
        ...grantedPermissions().ios,
        status: 1,
        allowsAlert: false,
        allowsSound: false,
      },
    });

    const notifications = await loadNotificationsModule();

    const firstAttempt =
      await notifications.scheduleWorkoutTimerNotificationAsync({
        key: 'rest',
        title: 'Rest timer finished',
        body: 'Time for your next set.',
        triggerAt: Date.now() + 15_000,
        data: {
          notificationType: 'workout-timer',
          kind: 'rest',
          sessionId: 'session-1',
        },
      });
    const secondAttempt =
      await notifications.scheduleWorkoutTimerNotificationAsync({
        key: 'rest',
        title: 'Rest timer finished',
        body: 'Time for your next set.',
        triggerAt: Date.now() + 15_000,
        data: {
          notificationType: 'workout-timer',
          kind: 'rest',
          sessionId: 'session-1',
        },
      });

    expect(firstAttempt).toBe('skipped');
    expect(secondAttempt).toBe('skipped');
    expect(mockRuntime.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockRuntime.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels every scheduled workout timer notification', async () => {
    mockRuntime.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'workout-timer:rest' },
      { identifier: 'other-notification' },
      { identifier: 'workout-timer:exercise:exercise-1' },
    ]);

    const notifications = await loadNotificationsModule();

    await notifications.cancelAllWorkoutTimerNotificationsAsync();

    expect(mockRuntime.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'workout-timer:rest',
    );
    expect(mockRuntime.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'workout-timer:exercise:exercise-1',
    );
    expect(
      mockRuntime.cancelScheduledNotificationAsync,
    ).not.toHaveBeenCalledWith('other-notification');
  });
});
