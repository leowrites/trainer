import { renderHook, act, cleanup } from '@testing-library/react-native';

import type { WorkoutSession, WorkoutSet } from '@core/database/types';
import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';

import { useWorkoutStore } from '../store';
import { useWorkoutSession } from '../hooks/use-workout-session';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_ID = 'session-001';

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: SESSION_ID,
    routine_id: 'routine-1',
    schedule_id: 'schedule-1',
    snapshot_name: 'Push A',
    start_time: 1_700_000_000_000,
    end_time: null,
    ...overrides,
  };
}

function makeSet(
  id: string,
  exerciseId: string,
  overrides: Partial<WorkoutSet & { exercise_name: string }> = {},
): WorkoutSet & { exercise_name: string } {
  return {
    id,
    session_id: SESSION_ID,
    exercise_id: exerciseId,
    weight: 100,
    reps: 8,
    is_completed: 0,
    exercise_name: 'Bench Press',
    ...overrides,
  };
}

// ─── useWorkoutSession ────────────────────────────────────────────────────────

describe('useWorkoutSession', () => {
  beforeEach(() => {
    useWorkoutStore.setState({
      isWorkoutActive: true,
      activeSessionId: SESSION_ID,
      startTime: Date.now(),
    });
  });

  afterEach(() => {
    cleanup();
    act(() => {
      useWorkoutStore.setState({
        isWorkoutActive: false,
        activeSessionId: null,
        startTime: null,
      });
    });
  });

  // ── Session loading ─────────────────────────────────────────────────────────

  it('loads the session metadata on mount', () => {
    const db = createMockDb();
    const sess = makeSession();
    db.getFirstSync.mockReturnValue(sess);
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    expect(result.current.session).toEqual(sess);
  });

  it('returns null session when not found in DB', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(null);
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    expect(result.current.session).toBeNull();
  });

  it('groups sets by exercise on mount', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    // Two sets for one exercise, one set for another
    db.getAllSync.mockReturnValue([
      makeSet('s1', 'ex-1', { exercise_name: 'Bench Press' }),
      makeSet('s2', 'ex-1', { exercise_name: 'Bench Press', reps: 6 }),
      makeSet('s3', 'ex-2', { exercise_name: 'Squat', weight: 140 }),
    ]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    const groups = result.current.exerciseGroups;
    expect(groups).toHaveLength(2);
    expect(groups[0].exerciseName).toBe('Bench Press');
    expect(groups[0].sets).toHaveLength(2);
    expect(groups[1].exerciseName).toBe('Squat');
    expect(groups[1].sets).toHaveLength(1);
  });

  it('returns empty exerciseGroups when the session has no sets', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    expect(result.current.exerciseGroups).toEqual([]);
  });

  it('loads availableExercises from the exercises table', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    const exercises = [
      { id: 'ex-1', name: 'Bench Press', muscle_group: 'Chest' },
      { id: 'ex-2', name: 'Squat', muscle_group: 'Legs' },
    ];
    // First getAllSync call returns sets (empty), second returns exercises
    db.getAllSync
      .mockReturnValueOnce([]) // workout_sets query
      .mockReturnValueOnce(exercises); // exercises query

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    expect(result.current.availableExercises).toEqual(exercises);
  });

  // ── addSet ──────────────────────────────────────────────────────────────────

  it('addSet inserts a new row into workout_sets', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    act(() => {
      result.current.addSet({ exerciseId: 'ex-1', weight: 80, reps: 10 });
    });

    const insertCalls = (db.runSync as jest.Mock).mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO workout_sets'),
    );
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0][1]).toEqual(
      expect.arrayContaining([SESSION_ID, 'ex-1', 80, 10, 0]),
    );
  });

  it('addSet uses is_completed = 0 for new sets', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    act(() => {
      result.current.addSet({ exerciseId: 'ex-1', weight: 60, reps: 12 });
    });

    const call = (db.runSync as jest.Mock).mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO workout_sets'),
    );
    // is_completed should be the last value (0)
    expect(call![1].at(-1)).toBe(0);
  });

  // ── updateSet ───────────────────────────────────────────────────────────────

  it('updateSet writes new weight and reps to the DB', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    act(() => {
      result.current.updateSet('set-abc', { weight: 120, reps: 5 });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE workout_sets SET weight = ?, reps = ? WHERE id = ?',
      [120, 5, 'set-abc'],
    );
  });

  // ── deleteSet ───────────────────────────────────────────────────────────────

  it('deleteSet removes the row from workout_sets', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    act(() => {
      result.current.deleteSet('set-xyz');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM workout_sets WHERE id = ?',
      ['set-xyz'],
    );
  });

  // ── toggleSetComplete ───────────────────────────────────────────────────────

  it('toggleSetComplete flips the is_completed flag via SQL CASE', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    act(() => {
      result.current.toggleSetComplete('set-toggle');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      expect.stringContaining(
        'is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END',
      ),
      ['set-toggle'],
    );
  });

  // ── finishSession ───────────────────────────────────────────────────────────

  it('finishSession stamps end_time on the session', () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_700_100_000_000);

    try {
      const db = createMockDb();
      db.getFirstSync.mockReturnValue(makeSession());
      db.getAllSync.mockReturnValue([]);

      const wrapper = createDatabaseWrapper(db);
      const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
        wrapper,
      });

      act(() => {
        result.current.finishSession();
      });

      expect(db.runSync).toHaveBeenCalledWith(
        'UPDATE workout_sessions SET end_time = ? WHERE id = ?',
        [1_700_100_000_000, SESSION_ID],
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('finishSession clears Zustand isWorkoutActive', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    act(() => {
      result.current.finishSession();
    });

    expect(useWorkoutStore.getState().isWorkoutActive).toBe(false);
    expect(useWorkoutStore.getState().activeSessionId).toBeNull();
  });

  // ── refresh ─────────────────────────────────────────────────────────────────

  it('refresh() triggers a re-fetch from DB', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(makeSession());
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutSession(SESSION_ID), {
      wrapper,
    });

    const callsBefore = (db.getAllSync as jest.Mock).mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    expect((db.getAllSync as jest.Mock).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
  });
});
