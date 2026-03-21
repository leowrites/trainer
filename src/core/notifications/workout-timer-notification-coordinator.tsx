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

import { navigateToActiveWorkoutScreen } from '@core/navigation';
import { useWorkoutStore } from '@features/workout-mode/store';
import type { WorkoutTimerNotificationRequest } from './types';
import {
  addWorkoutTimerNotificationResponseListener,
  cancelAllWorkoutTimerNotificationsAsync,
  cancelWorkoutTimerNotificationAsync,
  getLastWorkoutTimerNotificationResponseData,
  scheduleWorkoutTimerNotificationAsync,
} from './workout-timer-notifications';

type ActiveTimerMap = Record<string, number>;

function buildActiveTimerMap(
  requests: WorkoutTimerNotificationRequest[],
): ActiveTimerMap {
  return Object.fromEntries(
    requests.map((request) => [request.key, request.triggerAt]),
  );
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

  const timerRequests = useMemo<WorkoutTimerNotificationRequest[]>(() => {
    if (!isWorkoutActive || !activeSessionId) {
      return [];
    }

    const requests: WorkoutTimerNotificationRequest[] = [];
    if (restTimerEndsAt !== null) {
      requests.push({
        key: 'rest',
        title: 'Rest timer finished',
        body: 'Time for your next set.',
        triggerAt: restTimerEndsAt,
        data: {
          notificationType: 'workout-timer',
          kind: 'rest',
          sessionId: activeSessionId,
        },
      });
    }

    for (const [exerciseId, triggerAt] of Object.entries(
      exerciseTimerEndsAtByExerciseId,
    )) {
      if (triggerAt === null) {
        continue;
      }

      const exerciseName =
        activeSession?.exercises.find(
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
          sessionId: activeSessionId,
          exerciseId,
        },
      });
    }

    return requests;
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
        return;
      }

      if (state.isWorkoutCollapsed) {
        state.expandWorkout();
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

    async function syncNotifications(): Promise<void> {
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
