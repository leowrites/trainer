import { act, renderHook } from '@testing-library/react-native';

import {
  createDatabaseWrapper,
  createMockDb,
} from '@core/database/__tests__/test-utils';
import { selectActiveWorkoutSnapshot, useWorkoutStore } from '../store';
import { useActiveWorkoutActions } from '../hooks/use-active-workout';
import type { ActiveWorkoutSession } from '../types';

jest.mock('@core/database/utils', () => ({
  generateId: jest.fn().mockReturnValue('new-set-1'),
}));

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
  id: 'session-1',
  title: 'Push A',
  startTime: 1_700_000_000_000,
  isFreeWorkout: false,
  exercises: [
    {
      exerciseId: 'exercise-1',
      exerciseName: 'Bench Press',
      sets: [
        {
          id: 'set-1',
          exerciseId: 'exercise-1',
          reps: 8,
          weight: 135,
          isCompleted: false,
          targetSets: 3,
          targetReps: 8,
        },
      ],
      targetSets: 3,
      targetReps: 8,
    },
  ],
};

describe('useActiveWorkoutActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutStore.getState().endWorkout();
    useWorkoutStore.getState().startWorkout(activeSession);
  });

  it('adds and removes ad hoc exercises without subscribing to the full session tree', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    useWorkoutStore.getState().endWorkout();
    useWorkoutStore.getState().startWorkout({
      ...activeSession,
      id: 'session-2',
      exercises: [],
    });

    const { result } = renderHook(() => useActiveWorkoutActions(), { wrapper });

    act(() => {
      result.current.addExercise('exercise-2', 'Goblet Squat');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workout_session_exercises'),
      [
        'new-set-1',
        'session-2',
        'exercise-2',
        0,
        60,
        'double_progression',
        null,
      ],
    );
    expect(
      selectActiveWorkoutSnapshot(useWorkoutStore.getState())?.exercises,
    ).toEqual([
      {
        exerciseId: 'exercise-2',
        exerciseName: 'Goblet Squat',
        restSeconds: 60,
        progressionPolicy: 'double_progression',
        targetRir: null,
        targetSets: null,
        targetReps: null,
        targetRepsMin: null,
        targetRepsMax: null,
        sets: [
          {
            id: 'new-set-1',
            exerciseId: 'exercise-2',
            position: 0,
            reps: 0,
            weight: 0,
            targetWeight: 0,
            isCompleted: false,
            targetSets: null,
            targetReps: null,
            targetRepsMin: null,
            targetRepsMax: null,
            actualRir: null,
            setRole: 'optional',
          },
        ],
      },
    ]);

    act(() => {
      result.current.removeExercise('exercise-2');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
      ['session-2', 'exercise-2'],
    );
    expect(
      selectActiveWorkoutSnapshot(useWorkoutStore.getState())?.exercises,
    ).toEqual([]);
  });

  it('persists set edits, additions, and deletions while keeping store selectors in sync', () => {
    jest.useFakeTimers();

    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result, unmount } = renderHook(() => useActiveWorkoutActions(), {
      wrapper,
    });

    act(() => {
      result.current.updateReps('set-1', 10);
      result.current.updateWeight('set-1', 145.5);
    });

    expect(
      selectActiveWorkoutSnapshot(useWorkoutStore.getState())?.exercises[0]
        .sets[0],
    ).toEqual(
      expect.objectContaining({
        id: 'set-1',
        reps: 10,
        weight: 145.5,
        isCompleted: false,
      }),
    );
    expect(
      db.runSync.mock.calls.some(([sql]) =>
        (sql as string).includes('UPDATE workout_sets'),
      ),
    ).toBe(false);

    act(() => {
      result.current.flushPendingWrites();
    });

    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining('SET reps = ?, weight = ?'),
      [10, 145.5, 'set-1'],
    );

    act(() => {
      result.current.addSet('exercise-1');
      result.current.deleteSet('set-1');
    });

    expect(
      db.runSync.mock.calls.some(([sql]) =>
        (sql as string).includes('INSERT INTO workout_sets'),
      ),
    ).toBe(true);
    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM workout_sets WHERE id = ?',
      ['set-1'],
    );
    expect(
      selectActiveWorkoutSnapshot(useWorkoutStore.getState())?.exercises[0]
        .sets,
    ).toEqual([
      expect.objectContaining({
        id: 'new-set-1',
        exerciseId: 'exercise-1',
        reps: 10,
        weight: 145.5,
      }),
    ]);

    unmount();
    jest.useRealTimers();
  });

  it('batches rapid RIR updates before flushing', () => {
    jest.useFakeTimers();

    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result, unmount } = renderHook(() => useActiveWorkoutActions(), {
      wrapper,
    });

    act(() => {
      result.current.updateActualRir('set-1', 3);
      result.current.updateActualRir('set-1', 2);
      result.current.updateActualRir('set-1', 1);
    });

    expect(
      selectActiveWorkoutSnapshot(useWorkoutStore.getState())?.exercises[0]
        .sets[0].actualRir,
    ).toBe(1);
    expect(
      db.runSync.mock.calls.some(([sql]) =>
        (sql as string).includes('actual_rir'),
      ),
    ).toBe(false);

    act(() => {
      jest.advanceTimersByTime(180);
    });

    const rirUpdateCalls = db.runSync.mock.calls.filter(([sql]) =>
      (sql as string).includes('actual_rir'),
    );
    expect(rirUpdateCalls).toHaveLength(1);
    expect(rirUpdateCalls[0]).toEqual([
      expect.stringContaining('SET actual_rir = ?'),
      [1, 'set-1'],
    ]);

    unmount();
    jest.useRealTimers();
  });

  it('flushes queued set changes before completing and deleting workouts', () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_700_000_123_000);

    const db = createMockDb();
    db.getFirstSync.mockImplementation((query: string, params?: unknown[]) => {
      if (query.includes('FROM workout_sessions WHERE id = ?')) {
        expect(params).toEqual(['session-1']);
        return {
          id: 'session-1',
          schedule_id: 'schedule-1',
        };
      }

      if (query.includes('FROM schedules WHERE id = ?')) {
        expect(params).toEqual(['schedule-1']);
        return {
          id: 'schedule-1',
          current_position: -1,
        };
      }

      return null;
    });
    db.getAllSync.mockImplementation((query: string, params?: unknown[]) => {
      if (query.includes('FROM schedule_entries WHERE schedule_id = ?')) {
        expect(params).toEqual(['schedule-1']);
        return [{ position: 0 }, { position: 1 }];
      }

      return [];
    });
    const wrapper = createDatabaseWrapper(db);
    const { result, unmount } = renderHook(() => useActiveWorkoutActions(), {
      wrapper,
    });

    act(() => {
      result.current.updateReps('set-1', 10);
    });

    act(() => {
      expect(result.current.completeWorkout()).toBe('session-1');
    });

    const completedSetFlushIndex = db.runSync.mock.calls.findIndex(
      ([sql, params]) =>
        (sql as string).includes('SET reps = ?') &&
        Array.isArray(params) &&
        params[0] === 10 &&
        params[1] === 'set-1',
    );
    const completeSessionIndex = db.runSync.mock.calls.findIndex(([sql]) =>
      (sql as string).includes('UPDATE workout_sessions SET end_time = ?'),
    );

    expect(completedSetFlushIndex).toBeGreaterThanOrEqual(0);
    expect(completeSessionIndex).toBeGreaterThan(completedSetFlushIndex);
    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE workout_sessions SET end_time = ? WHERE id = ?',
      [1_700_000_123_000, 'session-1'],
    );
    expect(useWorkoutStore.getState().isWorkoutActive).toBe(false);

    useWorkoutStore.getState().startWorkout(activeSession);
    db.runSync.mockClear();

    act(() => {
      result.current.updateWeight('set-1', 140);
    });

    act(() => {
      expect(result.current.deleteWorkout()).toBe(true);
    });

    const deletedSetFlushIndex = db.runSync.mock.calls.findIndex(
      ([sql, params]) =>
        (sql as string).includes('SET weight = ?') &&
        Array.isArray(params) &&
        params[0] === 140 &&
        params[1] === 'set-1',
    );
    const deleteSetsIndex = db.runSync.mock.calls.findIndex(([sql]) =>
      (sql as string).includes('DELETE FROM workout_sets WHERE session_id = ?'),
    );

    expect(deletedSetFlushIndex).toBeGreaterThanOrEqual(0);
    expect(deleteSetsIndex).toBeGreaterThan(deletedSetFlushIndex);
    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM workout_sets WHERE session_id = ?',
      ['session-1'],
    );
    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM workout_sessions WHERE id = ?',
      ['session-1'],
    );
    expect(useWorkoutStore.getState().isWorkoutActive).toBe(false);

    unmount();
    jest.useRealTimers();
  });
});
