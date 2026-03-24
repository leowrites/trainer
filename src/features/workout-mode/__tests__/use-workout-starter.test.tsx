import { act, renderHook } from '@testing-library/react-native';

import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';
import { selectActiveWorkoutSnapshot, useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import type { ActiveWorkoutSession } from '../types';

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

describe('useWorkoutStarter', () => {
  beforeEach(() => {
    useWorkoutStore.getState().endWorkout();
  });

  it('creates a session snapshot, placeholder sets, and hydrates the active store state', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_700_000_000_000);

    const db = createMockDb();
    db.getFirstAsync.mockImplementation((query: string, params?: unknown[]) => {
      if (
        query.includes('FROM schedules WHERE is_active = 1 AND is_deleted = 0')
      ) {
        return {
          id: 'schedule-1',
          name: 'Upper Split',
          is_active: 1,
          current_position: -1,
        };
      }

      if (query.includes('FROM routines WHERE id = ? AND is_deleted = 0')) {
        expect(params).toEqual(['routine-1']);
        return {
          id: 'routine-1',
          name: 'Push A',
          notes: null,
        };
      }

      return null;
    });
    db.getAllAsync.mockImplementation((query: string) => {
      if (query.includes('FROM schedule_entries')) {
        return [
          {
            id: 'entry-1',
            schedule_id: 'schedule-1',
            routine_id: 'routine-1',
            position: 0,
          },
        ];
      }

      if (query.includes('FROM routine_exercises')) {
        return [
          {
            id: 're-1',
            routine_id: 'routine-1',
            exercise_id: 'exercise-1',
            position: 0,
            target_sets: 2,
            target_reps: 8,
          },
          {
            id: 're-2',
            routine_id: 'routine-1',
            exercise_id: 'exercise-2',
            position: 1,
            target_sets: 1,
            target_reps: 10,
          },
        ];
      }

      if (query.includes('FROM exercises')) {
        return [
          { id: 'exercise-1', name: 'Bench Press' },
          { id: 'exercise-2', name: 'Incline Press' },
        ];
      }

      return [];
    });

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });
    db.runAsync.mockClear();
    db.withTransactionAsync.mockClear();

    let sessionId: string | null = null;
    await act(async () => {
      sessionId = await result.current.startWorkoutFromSchedule();
    });

    expect(typeof sessionId).toBe('string');
    expect(sessionId).not.toHaveLength(0);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledWith(
      'INSERT INTO workout_sessions (id, routine_id, schedule_id, snapshot_name, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, 'routine-1', 'schedule-1', 'Push A', 1_700_000_000_000, null],
    );

    const setInsertCalls = db.runAsync.mock.calls.filter(([query]) =>
      (query as string).includes('INSERT INTO workout_sets'),
    );
    const sessionExerciseInsertCalls = db.runAsync.mock.calls.filter(
      ([query]) =>
        (query as string).includes('INSERT INTO workout_session_exercises'),
    );
    expect(sessionExerciseInsertCalls).toHaveLength(2);
    expect(setInsertCalls).toHaveLength(3);
    expect(setInsertCalls[0][1]).toEqual([
      expect.any(String),
      sessionId,
      'exercise-1',
      0,
      0,
      8,
      0,
      2,
      8,
      8,
      8,
      'work',
    ]);
    expect(setInsertCalls[1][1]).toEqual([
      expect.any(String),
      sessionId,
      'exercise-1',
      1,
      0,
      8,
      0,
      2,
      8,
      8,
      8,
      'work',
    ]);
    expect(setInsertCalls[2][1]).toEqual([
      expect.any(String),
      sessionId,
      'exercise-2',
      0,
      0,
      10,
      0,
      1,
      10,
      10,
      10,
      'work',
    ]);
    expect(db.runAsync).not.toHaveBeenCalledWith(
      'UPDATE schedules SET current_position = ? WHERE id = ?',
      [0, 'schedule-1'],
    );
    expect(
      db.getAllAsync.mock.calls.some(([query]) =>
        (query as string).includes('FROM workout_session_exercises'),
      ),
    ).toBe(false);
    expect(
      db.getAllAsync.mock.calls.some(([query]) =>
        (query as string).includes('FROM workout_sets ws'),
      ),
    ).toBe(false);
    const snapshot = selectActiveWorkoutSnapshot(useWorkoutStore.getState());
    expect(snapshot).toMatchObject<ActiveWorkoutSession>({
      id: sessionId!,
      title: 'Push A',
      startTime: 1_700_000_000_000,
      isFreeWorkout: false,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          targetSets: 2,
          targetReps: 8,
          sets: [
            expect.objectContaining({
              exerciseId: 'exercise-1',
              reps: 8,
              weight: 0,
              isCompleted: false,
              targetSets: 2,
              targetReps: 8,
            }),
            expect.objectContaining({
              exerciseId: 'exercise-1',
              reps: 8,
              weight: 0,
              isCompleted: false,
              targetSets: 2,
              targetReps: 8,
            }),
          ],
        },
        {
          exerciseId: 'exercise-2',
          exerciseName: 'Incline Press',
          targetSets: 1,
          targetReps: 10,
          sets: [
            expect.objectContaining({
              exerciseId: 'exercise-2',
              reps: 10,
              weight: 0,
              isCompleted: false,
              targetSets: 1,
              targetReps: 10,
            }),
          ],
        },
      ],
    });

    jest.useRealTimers();
  });
});
