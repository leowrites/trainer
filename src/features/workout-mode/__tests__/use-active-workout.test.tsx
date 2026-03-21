import { act, renderHook } from '@testing-library/react-native';

import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';
import { useActiveWorkout } from '../hooks/use-active-workout';
import { useWorkoutStore } from '../store';
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

describe('useActiveWorkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutStore.setState({
      isWorkoutActive: true,
      activeSessionId: activeSession.id,
      startTime: activeSession.startTime,
      activeSession,
    });
  });

  it('adds and removes ad hoc exercise blocks during an active workout', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    useWorkoutStore.setState({
      isWorkoutActive: true,
      activeSessionId: 'session-2',
      startTime: activeSession.startTime,
      activeSession: {
        ...activeSession,
        id: 'session-2',
        title: 'Push A',
        isFreeWorkout: false,
        exercises: [],
      },
    });

    const { result } = renderHook(() => useActiveWorkout(), { wrapper });

    act(() => {
      result.current.addExercise('exercise-2', 'Goblet Squat');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workout_session_exercises'),
      ['new-set-1', 'session-2', 'exercise-2', 0, 60],
    );
    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workout_sets'),
      ['new-set-1', 'session-2', 'exercise-2', 0, 0, 0, 0, null, null],
    );
    expect(useWorkoutStore.getState().activeSession?.exercises).toEqual([
      {
        exerciseId: 'exercise-2',
        exerciseName: 'Goblet Squat',
        restSeconds: 60,
        targetSets: null,
        targetReps: null,
        sets: [
          {
            id: 'new-set-1',
            exerciseId: 'exercise-2',
            position: 0,
            reps: 0,
            weight: 0,
            isCompleted: false,
            targetSets: null,
            targetReps: null,
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
    expect(useWorkoutStore.getState().activeSession?.exercises).toEqual([]);
  });

  it('does not insert duplicate ad hoc exercises when addExercise is triggered twice', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    useWorkoutStore.setState({
      isWorkoutActive: true,
      activeSessionId: 'session-2',
      startTime: activeSession.startTime,
      activeSession: {
        ...activeSession,
        id: 'session-2',
        exercises: [],
      },
    });

    const { result } = renderHook(() => useActiveWorkout(), { wrapper });

    act(() => {
      result.current.addExercise('exercise-2', 'Goblet Squat');
      result.current.addExercise('exercise-2', 'Goblet Squat');
    });

    expect(
      db.runSync.mock.calls.filter(([sql]) =>
        (sql as string).includes('INSERT INTO workout_sets'),
      ),
    ).toHaveLength(1);
    expect(useWorkoutStore.getState().activeSession?.exercises).toHaveLength(1);
  });

  it('removes planned routine exercises during an active workout', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useActiveWorkout(), { wrapper });

    act(() => {
      result.current.removeExercise('exercise-1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?',
      ['session-1', 'exercise-1'],
    );
    expect(useWorkoutStore.getState().activeSession?.exercises).toEqual([]);
  });

  it('persists set edits/additions/deletions and keeps the store in sync', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useActiveWorkout(), { wrapper });

    act(() => {
      result.current.updateReps('set-1', 10);
    });
    act(() => {
      result.current.updateWeight('set-1', 145.5);
    });
    act(() => {
      result.current.addSet('exercise-1');
    });
    act(() => {
      result.current.deleteSet('set-1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE workout_sets SET reps = ?, is_completed = 1 WHERE id = ?',
      [10, 'set-1'],
    );
    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE workout_sets SET weight = ?, is_completed = 1 WHERE id = ?',
      [145.5, 'set-1'],
    );
    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workout_sets'),
      ['new-set-1', 'session-1', 'exercise-1', 0, 145.5, 10, 0, 3, 8],
    );
    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM workout_sets WHERE id = ?',
      ['set-1'],
    );
    expect(useWorkoutStore.getState().activeSession?.exercises[0].sets).toEqual(
      [
        {
          id: 'new-set-1',
          exerciseId: 'exercise-1',
          position: 0,
          reps: 10,
          weight: 145.5,
          isCompleted: false,
          targetSets: 3,
          targetReps: 8,
        },
      ],
    );
  });

  it('completes the workout by persisting end_time before clearing ephemeral state', () => {
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
    const { result } = renderHook(() => useActiveWorkout(), { wrapper });

    act(() => {
      expect(result.current.completeWorkout()).toBe('session-1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE workout_sessions SET end_time = ? WHERE id = ?',
      [1_700_000_123_000, 'session-1'],
    );
    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE schedules SET current_position = ? WHERE id = ?',
      [0, 'schedule-1'],
    );
    expect(useWorkoutStore.getState().isWorkoutActive).toBe(false);
    expect(useWorkoutStore.getState().activeSession).toBeNull();

    jest.useRealTimers();
  });

  it('deletes the active workout session before clearing ephemeral state', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useActiveWorkout(), { wrapper });

    act(() => {
      expect(result.current.deleteWorkout()).toBe(true);
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM workout_sets WHERE session_id = ?',
      ['session-1'],
    );
    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM workout_sessions WHERE id = ?',
      ['session-1'],
    );
    expect(useWorkoutStore.getState().isWorkoutActive).toBe(false);
    expect(useWorkoutStore.getState().activeSession).toBeNull();
  });
});
