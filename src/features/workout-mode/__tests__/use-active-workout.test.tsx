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

  it('adds and removes exercise blocks during a free workout', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    useWorkoutStore.setState({
      isWorkoutActive: true,
      activeSessionId: 'session-2',
      startTime: activeSession.startTime,
      activeSession: {
        ...activeSession,
        id: 'session-2',
        title: 'Free Workout',
        isFreeWorkout: true,
        exercises: [],
      },
    });

    const { result } = renderHook(() => useActiveWorkout(), { wrapper });

    act(() => {
      result.current.addExercise('exercise-2', 'Goblet Squat');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT INTO workout_sets (id, session_id, exercise_id, weight, reps, is_completed, target_sets, target_reps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['new-set-1', 'session-2', 'exercise-2', 0, 0, 0, null, null],
    );
    expect(useWorkoutStore.getState().activeSession?.exercises).toEqual([
      {
        exerciseId: 'exercise-2',
        exerciseName: 'Goblet Squat',
        targetSets: null,
        targetReps: null,
        sets: [
          {
            id: 'new-set-1',
            exerciseId: 'exercise-2',
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
      'INSERT INTO workout_sets (id, session_id, exercise_id, weight, reps, is_completed, target_sets, target_reps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['new-set-1', 'session-1', 'exercise-1', 145.5, 10, 0, 3, 8],
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
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useActiveWorkout(), { wrapper });

    act(() => {
      expect(result.current.completeWorkout()).toBe(true);
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE workout_sessions SET end_time = ? WHERE id = ?',
      [1_700_000_123_000, 'session-1'],
    );
    expect(useWorkoutStore.getState().isWorkoutActive).toBe(false);
    expect(useWorkoutStore.getState().activeSession).toBeNull();

    jest.useRealTimers();
  });
});
