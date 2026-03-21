import { act, renderHook } from '@testing-library/react-native';

import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';
import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import type { ActiveWorkoutSession } from '../types';
import { loadActiveWorkoutSession } from '../session-repository';

jest.mock('../session-repository', () => ({
  loadActiveWorkoutSession: jest.fn(),
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

const mockLoadActiveWorkoutSession = jest.mocked(loadActiveWorkoutSession);
const baseHydratedSession: ActiveWorkoutSession = {
  id: 'session-template',
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
          weight: 0,
          isCompleted: false,
          targetSets: 2,
          targetReps: 8,
        },
        {
          id: 'set-2',
          exerciseId: 'exercise-1',
          reps: 8,
          weight: 0,
          isCompleted: false,
          targetSets: 2,
          targetReps: 8,
        },
      ],
      targetSets: 2,
      targetReps: 8,
    },
    {
      exerciseId: 'exercise-2',
      exerciseName: 'Incline Press',
      sets: [
        {
          id: 'set-3',
          exerciseId: 'exercise-2',
          reps: 10,
          weight: 0,
          isCompleted: false,
          targetSets: 1,
          targetReps: 10,
        },
      ],
      targetSets: 1,
      targetReps: 10,
    },
  ],
};

describe('useWorkoutStarter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWorkoutStore.setState({
      isWorkoutActive: false,
      activeSessionId: null,
      startTime: null,
      activeSession: null,
    });
    mockLoadActiveWorkoutSession.mockImplementation((_, sessionId) => ({
      ...baseHydratedSession,
      id: sessionId,
    }));
  });

  it('creates a session snapshot, placeholder sets, and hydrates the active store state', () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_700_000_000_000);

    const db = createMockDb();
    db.getFirstSync.mockImplementation((query: string, params?: unknown[]) => {
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
    db.getAllSync.mockImplementation((query: string) => {
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

      return [];
    });

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });
    db.runSync.mockClear();
    db.withTransactionSync.mockClear();

    let sessionId: string | null = null;
    act(() => {
      sessionId = result.current.startWorkoutFromSchedule();
    });

    expect(typeof sessionId).toBe('string');
    expect(sessionId).not.toHaveLength(0);
    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT INTO workout_sessions (id, routine_id, schedule_id, snapshot_name, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, 'routine-1', 'schedule-1', 'Push A', 1_700_000_000_000, null],
    );

    const setInsertCalls = db.runSync.mock.calls.filter(([query]) =>
      (query as string).includes('INSERT INTO workout_sets'),
    );
    expect(setInsertCalls).toHaveLength(3);
    expect(setInsertCalls[0][1]).toEqual([
      expect.any(String),
      sessionId,
      'exercise-1',
      0,
      8,
      0,
      2,
      8,
    ]);
    expect(setInsertCalls[1][1]).toEqual([
      expect.any(String),
      sessionId,
      'exercise-1',
      0,
      8,
      0,
      2,
      8,
    ]);
    expect(setInsertCalls[2][1]).toEqual([
      expect.any(String),
      sessionId,
      'exercise-2',
      0,
      10,
      0,
      1,
      10,
    ]);
    expect(db.runSync).not.toHaveBeenCalledWith(
      'UPDATE schedules SET current_position = ? WHERE id = ?',
      [0, 'schedule-1'],
    );
    expect(mockLoadActiveWorkoutSession).toHaveBeenCalledWith(db, sessionId);
    expect(useWorkoutStore.getState().activeSession).toEqual({
      ...baseHydratedSession,
      id: sessionId,
    });

    jest.useRealTimers();
  });
});
