import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useWorkoutStore } from '@features/workout-mode/store';
import type { ActiveWorkoutSession } from '@features/workout-mode/types';

const mockScheduleWorkoutTimerNotificationAsync = jest.fn();
const mockCancelWorkoutTimerNotificationAsync = jest.fn();
const mockCancelAllWorkoutTimerNotificationsAsync = jest.fn();
const mockGetLastWorkoutTimerNotificationResponseData = jest.fn();
const mockAddWorkoutTimerNotificationResponseListener = jest.fn();
const mockNavigateToActiveWorkoutScreen = jest.fn();
const mockLoadInProgressWorkoutSession = jest.fn();
const mockLoadLatestInProgressWorkoutSession = jest.fn();
const mockDatabase = { name: 'mock-db' };

jest.mock('../workout-timer-notifications', () => ({
  scheduleWorkoutTimerNotificationAsync:
    mockScheduleWorkoutTimerNotificationAsync,
  cancelWorkoutTimerNotificationAsync: mockCancelWorkoutTimerNotificationAsync,
  cancelAllWorkoutTimerNotificationsAsync:
    mockCancelAllWorkoutTimerNotificationsAsync,
  getLastWorkoutTimerNotificationResponseData:
    mockGetLastWorkoutTimerNotificationResponseData,
  addWorkoutTimerNotificationResponseListener:
    mockAddWorkoutTimerNotificationResponseListener,
}));

jest.mock('@core/navigation', () => ({
  navigateToActiveWorkoutScreen: mockNavigateToActiveWorkoutScreen,
}));

jest.mock('@core/database/provider', () => ({
  useDatabase: () => mockDatabase,
}));

jest.mock('@features/workout-mode', () => {
  const storeModule = jest.requireActual('@features/workout-mode/store');

  return {
    useWorkoutStore: storeModule.useWorkoutStore,
    loadInProgressWorkoutSession: mockLoadInProgressWorkoutSession,
    loadLatestInProgressWorkoutSession: mockLoadLatestInProgressWorkoutSession,
  };
});

const { WorkoutTimerNotificationCoordinator } =
  require('../workout-timer-notification-coordinator') as {
    WorkoutTimerNotificationCoordinator: React.ComponentType;
  };

const mockSession: ActiveWorkoutSession = {
  id: 'session-1',
  title: 'Push A',
  startTime: 1_700_000_000_000,
  isFreeWorkout: false,
  exercises: [
    {
      exerciseId: 'exercise-1',
      exerciseName: 'Bench Press',
      targetSets: 3,
      targetReps: 8,
      sets: [],
    },
  ],
};

function resetWorkoutStore(): void {
  useWorkoutStore.setState({
    isWorkoutActive: false,
    isWorkoutCollapsed: false,
    activeSessionId: null,
    startTime: null,
    activeSessionMeta: null,
    activeExerciseOrder: [],
    activeExercisesById: {},
    activeSetsById: {},
    activeRouteSetIds: [],
    activeSummary: {
      exerciseCount: 0,
      completedExerciseCount: 0,
      setCount: 0,
      completedSetCount: 0,
      volume: 0,
    },
    restTimerEndsAt: null,
    exerciseTimerEndsAtByExerciseId: {},
    exerciseTimerDurationByExerciseId: {},
  });
}

describe('WorkoutTimerNotificationCoordinator', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 21, 9, 0, 0));
    jest.clearAllMocks();
    resetWorkoutStore();
    mockScheduleWorkoutTimerNotificationAsync.mockResolvedValue('scheduled');
    mockCancelWorkoutTimerNotificationAsync.mockResolvedValue(undefined);
    mockCancelAllWorkoutTimerNotificationsAsync.mockResolvedValue(undefined);
    mockGetLastWorkoutTimerNotificationResponseData.mockReturnValue(null);
    mockAddWorkoutTimerNotificationResponseListener.mockImplementation(
      () => () => undefined,
    );
    mockLoadInProgressWorkoutSession.mockReturnValue(null);
    mockLoadLatestInProgressWorkoutSession.mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules rest and exercise timer notifications from store state', async () => {
    useWorkoutStore.getState().startWorkout(mockSession);
    useWorkoutStore.setState({
      restTimerEndsAt: Date.now() + 90_000,
      exerciseTimerEndsAtByExerciseId: {
        'exercise-1': Date.now() + 60_000,
      },
    });

    render(<WorkoutTimerNotificationCoordinator />);

    await waitFor(() => {
      expect(mockScheduleWorkoutTimerNotificationAsync).toHaveBeenCalledTimes(
        2,
      );
    });
    expect(mockScheduleWorkoutTimerNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'rest',
        title: 'Rest timer finished',
      }),
    );
    expect(mockScheduleWorkoutTimerNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'exercise:exercise-1',
        title: 'Bench Press timer finished',
      }),
    );
  });

  it('reschedules restarted timers and cancels removed ones', async () => {
    useWorkoutStore.getState().startWorkout(mockSession);
    useWorkoutStore.setState({
      restTimerEndsAt: Date.now() + 60_000,
    });

    render(<WorkoutTimerNotificationCoordinator />);

    await waitFor(() => {
      expect(mockScheduleWorkoutTimerNotificationAsync).toHaveBeenCalledTimes(
        1,
      );
    });

    act(() => {
      useWorkoutStore.setState({
        restTimerEndsAt: Date.now() + 120_000,
      });
    });

    await waitFor(() => {
      expect(mockScheduleWorkoutTimerNotificationAsync).toHaveBeenCalledTimes(
        2,
      );
    });

    act(() => {
      useWorkoutStore.getState().clearRestTimer();
    });

    await waitFor(() => {
      expect(mockCancelWorkoutTimerNotificationAsync).toHaveBeenCalledWith(
        'rest',
      );
    });
  });

  it('cancels all workout timer notifications when the workout ends', async () => {
    useWorkoutStore.getState().startWorkout(mockSession);
    useWorkoutStore.setState({
      restTimerEndsAt: Date.now() + 45_000,
    });

    render(<WorkoutTimerNotificationCoordinator />);

    await waitFor(() => {
      expect(mockScheduleWorkoutTimerNotificationAsync).toHaveBeenCalledTimes(
        1,
      );
    });

    act(() => {
      useWorkoutStore.getState().endWorkout();
    });

    await waitFor(() => {
      expect(mockCancelAllWorkoutTimerNotificationsAsync).toHaveBeenCalled();
    });
  });

  it('clears expired timers without relying on the workout screen', async () => {
    useWorkoutStore.getState().startWorkout(mockSession);
    useWorkoutStore.setState({
      restTimerEndsAt: Date.now() + 500,
    });

    render(<WorkoutTimerNotificationCoordinator />);

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    await waitFor(() => {
      expect(useWorkoutStore.getState().restTimerEndsAt).toBeNull();
    });
  });

  it('reopens the active workout when a workout timer notification is tapped', async () => {
    let notificationTapListener:
      | ((data: { sessionId: string }) => void)
      | undefined;

    mockAddWorkoutTimerNotificationResponseListener.mockImplementation(
      (listener) => {
        notificationTapListener = listener;
        return () => undefined;
      },
    );

    useWorkoutStore.getState().startWorkout(mockSession);
    useWorkoutStore.getState().collapseWorkout();

    render(<WorkoutTimerNotificationCoordinator />);

    act(() => {
      notificationTapListener?.({
        sessionId: 'session-1',
      });
    });

    expect(useWorkoutStore.getState().isWorkoutCollapsed).toBe(false);
    expect(mockNavigateToActiveWorkoutScreen).toHaveBeenCalledTimes(1);
  });

  it('restores the latest in-progress workout on cold launch without navigating', async () => {
    mockLoadLatestInProgressWorkoutSession.mockReturnValue(mockSession);

    render(<WorkoutTimerNotificationCoordinator />);

    await waitFor(() => {
      expect(mockLoadLatestInProgressWorkoutSession).toHaveBeenCalledWith(
        mockDatabase,
      );
    });
    expect(useWorkoutStore.getState().isWorkoutActive).toBe(true);
    expect(useWorkoutStore.getState().activeSessionId).toBe('session-1');
    expect(mockNavigateToActiveWorkoutScreen).not.toHaveBeenCalled();
  });

  it('restores an in-progress workout from storage on cold-start notification taps', async () => {
    mockGetLastWorkoutTimerNotificationResponseData.mockReturnValue({
      sessionId: 'session-1',
    });
    mockLoadInProgressWorkoutSession.mockReturnValue(mockSession);

    render(<WorkoutTimerNotificationCoordinator />);

    await waitFor(() => {
      expect(mockLoadInProgressWorkoutSession).toHaveBeenCalledWith(
        mockDatabase,
        'session-1',
      );
    });
    expect(useWorkoutStore.getState().isWorkoutActive).toBe(true);
    expect(useWorkoutStore.getState().activeSessionId).toBe('session-1');
    expect(mockNavigateToActiveWorkoutScreen).toHaveBeenCalledTimes(1);
  });

  it('reconciles notification state when an older async sync finishes late', async () => {
    let resolveFirstSchedule: ((value: 'scheduled') => void) | null = null;
    mockScheduleWorkoutTimerNotificationAsync
      .mockImplementationOnce(
        () =>
          new Promise<'scheduled'>((resolve) => {
            resolveFirstSchedule = resolve;
          }),
      )
      .mockResolvedValue('scheduled');

    useWorkoutStore.getState().startWorkout(mockSession);
    useWorkoutStore.setState({
      restTimerEndsAt: Date.now() + 60_000,
    });

    render(<WorkoutTimerNotificationCoordinator />);

    await waitFor(() => {
      expect(mockScheduleWorkoutTimerNotificationAsync).toHaveBeenCalledTimes(
        1,
      );
    });

    act(() => {
      useWorkoutStore.getState().clearRestTimer();
    });

    await act(async () => {
      resolveFirstSchedule?.('scheduled');
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockCancelAllWorkoutTimerNotificationsAsync).toHaveBeenCalled();
    });
  });
});
