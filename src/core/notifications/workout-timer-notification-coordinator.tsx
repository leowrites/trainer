/**
 * Workout timer notification coordinator.
 *
 * CALLING SPEC:
 *   Mount <WorkoutTimerNotificationCoordinator /> once near App.tsx.
 *
 * Inputs:
 *   Reads active workout timer state from the workout Zustand store.
 *
 * Side effects:
 *   Schedules/cancels OS notifications for workout timers, clears naturally
 *   expired timers from the store, and routes notification taps back to the
 *   active workout screen when the session is still active.
 */

import type { JSX } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { database } from '@core/database';
import { navigateToActiveWorkoutScreen } from '@core/navigation';
import {
  loadInProgressWorkoutSession,
  useWorkoutStore,
} from '@features/workout-mode';
import type { WorkoutTimerNotificationRequest } from './types';
import {
  addWorkoutTimerNotificationResponseListener,
  cancelAllWorkoutTimerNotificationsAsync,
  cancelWorkoutTimerNotificationAsync,
  getLastWorkoutTimerNotificationResponseData,
  scheduleWorkoutTimerNotificationAsync,
} from './workout-timer-notifications';

type ActiveTimerMap = Record<string, number>;
type WorkoutStoreState = ReturnType<typeof useWorkoutStore.getState>;

function buildActiveTimerMap(
  requests: WorkoutTimerNotificationRequest[],
): ActiveTimerMap {
  return Object.fromEntries(
    requests.map((request) => [request.key, request.triggerAt]),
  );
}

function buildTimerRequests(
  state: Pick<
    WorkoutStoreState,
    | 'isWorkoutActive'
    | 'activeSessionId'
    | 'activeSession'
    | 'restTimerEndsAt'
    | 'exerciseTimerEndsAtByExerciseId'
  >,
): WorkoutTimerNotificationRequest[] {
  if (!state.isWorkoutActive || !state.activeSessionId) {
    return [];
  }

  const requests: WorkoutTimerNotificationRequest[] = [];
  if (state.restTimerEndsAt !== null) {
    requests.push({
      key: 'rest',
      title: 'Rest timer finished',
      body: 'Time for your next set.',
      triggerAt: state.restTimerEndsAt,
      data: {
        notificationType: 'workout-timer',
        kind: 'rest',
        sessionId: state.activeSessionId,
      },
    });
  }

  for (const [exerciseId, triggerAt] of Object.entries(
    state.exerciseTimerEndsAtByExerciseId,
  )) {
    if (triggerAt === null) {
      continue;
    }

    const exerciseName =
      state.activeSession?.exercises.find(
        (exercise) => exercise.exerciseId === exerciseId,
      )?.exerciseName ?? 'Exercise';

    requests.push({
      key: `exercise:${exerciseId}`,
      title: `${exerciseName} timer finished`,
      body: 'Your timer has ended.',
      triggerAt,
      data: {
        notificationType: 'workout-timer',
        kind: 'exercise',
        sessionId: state.activeSessionId,
        exerciseId,
      },
    });
  }

  return requests;
}

export function WorkoutTimerNotificationCoordinator(): JSX.Element | null {
  const {
    isWorkoutActive,
    activeSessionId,
    activeSession,
    restTimerEndsAt,
    exerciseTimerEndsAtByExerciseId,
  } = useWorkoutStore(
    useShallow((state) => ({
      isWorkoutActive: state.isWorkoutActive,
      activeSessionId: state.activeSessionId,
      activeSession: state.activeSession,
      restTimerEndsAt: state.restTimerEndsAt,
      exerciseTimerEndsAtByExerciseId: state.exerciseTimerEndsAtByExerciseId,
    })),
  );
  const previousTimerMapRef = useRef<ActiveTimerMap>({});
  const syncRunIdRef = useRef(0);

  const timerRequests = useMemo<WorkoutTimerNotificationRequest[]>(() => {
    return buildTimerRequests({
      isWorkoutActive,
      activeSessionId,
      activeSession,
      restTimerEndsAt,
      exerciseTimerEndsAtByExerciseId,
    });
  }, [
    activeSession,
    activeSessionId,
    exerciseTimerEndsAtByExerciseId,
    isWorkoutActive,
    restTimerEndsAt,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useWorkoutStore.getState();
      const now = Date.now();

      if (state.restTimerEndsAt !== null && state.restTimerEndsAt <= now) {
        state.clearRestTimer();
      }

      for (const [exerciseId, endsAt] of Object.entries(
        state.exerciseTimerEndsAtByExerciseId,
      )) {
        if (endsAt !== null && endsAt <= now) {
          state.clearExerciseTimer(exerciseId);
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function openActiveWorkoutFromNotification(sessionId: string): void {
      const state = useWorkoutStore.getState();
      if (!state.isWorkoutActive || state.activeSessionId !== sessionId) {
        const restoredSession = loadInProgressWorkoutSession(
          database,
          sessionId,
        );
        if (!restoredSession) {
          return;
        }

        state.startWorkout(restoredSession);
      }

      const latestState = useWorkoutStore.getState();
      if (latestState.isWorkoutCollapsed) {
        latestState.expandWorkout();
      }

      navigateToActiveWorkoutScreen();
    }

    const lastResponseData = getLastWorkoutTimerNotificationResponseData();
    if (lastResponseData) {
      openActiveWorkoutFromNotification(lastResponseData.sessionId);
    }

    return addWorkoutTimerNotificationResponseListener((data) => {
      openActiveWorkoutFromNotification(data.sessionId);
    });
  }, []);

  useEffect(() => {
    let disposed = false;

    async function reconcileLatestNotifications(): Promise<void> {
      const latestState = useWorkoutStore.getState();
      const latestRequests = buildTimerRequests(latestState);
      const now = Date.now();

      await cancelAllWorkoutTimerNotificationsAsync();

      for (const request of latestRequests) {
        if (request.triggerAt <= now) {
          continue;
        }

        await scheduleWorkoutTimerNotificationAsync(request);
      }

      if (!disposed) {
        previousTimerMapRef.current = buildActiveTimerMap(latestRequests);
      }
    }

    async function syncNotifications(): Promise<void> {
      const syncRunId = ++syncRunIdRef.current;
      const previousTimerMap = previousTimerMapRef.current;
      const currentTimerMap = buildActiveTimerMap(timerRequests);
      const now = Date.now();

      if (!isWorkoutActive || !activeSessionId) {
        await cancelAllWorkoutTimerNotificationsAsync();
        if (!disposed) {
          previousTimerMapRef.current = {};
        }
        return;
      }

      for (const [key, previousTriggerAt] of Object.entries(previousTimerMap)) {
        if (!(key in currentTimerMap) && previousTriggerAt > now) {
          await cancelWorkoutTimerNotificationAsync(key);
          if (disposed || syncRunId !== syncRunIdRef.current) {
            await reconcileLatestNotifications();
            return;
          }
        }
      }

      for (const request of timerRequests) {
        if (request.triggerAt <= now) {
          continue;
        }

        if (previousTimerMap[request.key] === request.triggerAt) {
          continue;
        }

        await scheduleWorkoutTimerNotificationAsync(request);
        if (disposed || syncRunId !== syncRunIdRef.current) {
          await reconcileLatestNotifications();
          return;
        }
      }

      if (!disposed) {
        previousTimerMapRef.current = currentTimerMap;
      }
    }

    void syncNotifications();

    return () => {
      disposed = true;
    };
  }, [activeSessionId, isWorkoutActive, timerRequests]);

  return null;
}
