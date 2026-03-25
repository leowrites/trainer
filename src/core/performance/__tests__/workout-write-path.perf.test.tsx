/**
 * Active-workout write-path perf contracts.
 *
 * CALLING SPEC:
 * - Enforces optimistic UI behavior for set-field interactions.
 * - Verifies sqlite writes are deferred off the interaction path and flushed
 *   by timer/effect triggers.
 * - Side effects: none beyond mocked sqlite writes and Zustand state updates.
 */

import { act, renderHook } from '@testing-library/react-native';

import {
  createDatabaseWrapper,
  createMockDb,
} from '@core/database/__tests__/test-utils';
import { createDbSyncCallTracker } from '@core/performance/testing';
import { useActiveWorkoutActions } from '@features/workout-mode/hooks/use-active-workout';
import { useWorkoutStore } from '@features/workout-mode/store';
import type { ActiveWorkoutSession } from '@features/workout-mode/types';

jest.mock('@lodev09/react-native-true-sheet', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  return {
    TrueSheet: React.forwardRef(
      (
        { children }: React.PropsWithChildren,
        ref: React.ForwardedRef<{
          present: () => Promise<void>;
          dismiss: () => Promise<void>;
        }>,
      ) => {
        React.useImperativeHandle(ref, () => ({
          present: async () => undefined,
          dismiss: async () => undefined,
        }));

        return <ReactNative.View>{children}</ReactNative.View>;
      },
    ),
  };
});

const activeSession: ActiveWorkoutSession = {
  id: 'perf-session-1',
  title: 'Perf Session',
  startTime: new Date(2026, 2, 24, 8, 0, 0).getTime(),
  isFreeWorkout: false,
  exercises: [
    {
      exerciseId: 'exercise-1',
      exerciseName: 'Bench Press',
      targetSets: 2,
      targetReps: 8,
      targetRepsMin: 8,
      targetRepsMax: 10,
      sets: [
        {
          id: 'set-1',
          exerciseId: 'exercise-1',
          reps: 8,
          weight: 135,
          isCompleted: false,
          targetSets: 2,
          targetReps: 8,
          targetRepsMin: 8,
          targetRepsMax: 10,
          actualRir: 2,
        },
      ],
    },
  ],
};

describe('workout write-path perf contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useWorkoutStore.getState().endWorkout();
    useWorkoutStore.getState().startWorkout(activeSession);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates RIR optimistically and defers sqlite writes until flush window', async () => {
    const db = createMockDb();
    const dbTracker = createDbSyncCallTracker(db);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useActiveWorkoutActions(), {
      wrapper,
    });

    dbTracker.setPhase('interaction');
    act(() => {
      result.current.updateActualRir('set-1', 0);
    });

    expect(useWorkoutStore.getState().activeSetsById['set-1']?.actualRir).toBe(
      0,
    );
    expect(
      dbTracker.countBy({
        phase: 'interaction',
        method: 'runSync',
      }),
    ).toBe(0);

    dbTracker.setPhase('effect');
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(
      dbTracker.countBy({
        phase: 'effect',
        method: 'runSync',
      }),
    ).toBeGreaterThan(0);

    dbTracker.restore();
  });

  it('batches rapid reps and weight edits into deferred flush writes', async () => {
    const db = createMockDb();
    const dbTracker = createDbSyncCallTracker(db);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useActiveWorkoutActions(), {
      wrapper,
    });

    dbTracker.setPhase('interaction');
    act(() => {
      result.current.updateReps('set-1', 9);
      result.current.updateWeight('set-1', 140);
      result.current.updateReps('set-1', 10);
    });

    expect(useWorkoutStore.getState().activeSetsById['set-1']?.reps).toBe(10);
    expect(useWorkoutStore.getState().activeSetsById['set-1']?.weight).toBe(
      140,
    );
    expect(
      dbTracker.countBy({
        phase: 'interaction',
        method: 'runSync',
      }),
    ).toBe(0);

    dbTracker.setPhase('effect');
    await act(async () => {
      jest.advanceTimersByTime(220);
      await Promise.resolve();
    });

    expect(
      dbTracker.countBy({
        phase: 'effect',
        method: 'runSync',
      }),
    ).toBeGreaterThan(0);

    dbTracker.restore();
  });
});
