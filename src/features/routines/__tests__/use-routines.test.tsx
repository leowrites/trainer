import { renderHook, act } from '@testing-library/react-native';

import type { Routine, RoutineExercise } from '@core/database/types';
import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';
import { useRoutines } from '../hooks/use-routines';

// ─── useRoutines ──────────────────────────────────────────────────────────────

describe('useRoutines', () => {
  it('returns an empty list on mount when DB has no routines', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });
    expect(result.current.routines).toEqual([]);
  });

  it('returns routines fetched from the DB on mount', () => {
    const db = createMockDb();
    const mockRows: Routine[] = [
      { id: 'r1', name: 'Push A', notes: null },
      { id: 'r2', name: 'Pull A', notes: null },
    ];
    db.getAllSync.mockReturnValue(mockRows);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });
    expect(result.current.routines).toEqual(mockRows);
  });

  it('createRoutine inserts the routine row', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.createRoutine({ name: 'Push A', exercises: [] });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT INTO routines (id, name, notes) VALUES (?, ?, ?)',
      expect.arrayContaining(['Push A']),
    );
  });

  it('createRoutine inserts routine_exercises for each exercise', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.createRoutine({
        name: 'Push A',
        exercises: [
          { exerciseId: 'e1', targetSets: 3, targetReps: 10 },
          { exerciseId: 'e2', targetSets: 4, targetReps: 8 },
        ],
      });
    });

    // Two routine_exercise INSERT calls
    const reCalls = (db.runSync as jest.Mock).mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO routine_exercises'),
    );
    expect(reCalls).toHaveLength(2);
    expect(reCalls[0][1]).toContain('e1');
    expect(reCalls[1][1]).toContain('e2');
  });

  it('createRoutine wraps writes in a transaction', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    db.withTransactionSync.mockClear();

    act(() => {
      result.current.createRoutine({ name: 'Push A', exercises: [] });
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('createRoutine returns the new routine object', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    let created: Routine | undefined;
    act(() => {
      created = result.current.createRoutine({ name: 'Pull A', exercises: [] });
    });

    expect(created).toMatchObject({ name: 'Pull A', notes: null });
    expect(typeof created?.id).toBe('string');
  });

  it('updateRoutine updates the routine name', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.updateRoutine('r1', { name: 'Push B', exercises: [] });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE routines SET name = ? WHERE id = ?',
      ['Push B', 'r1'],
    );
  });

  it('updateRoutine replaces routine_exercises (delete then re-insert)', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.updateRoutine('r1', {
        name: 'Push B',
        exercises: [{ exerciseId: 'e3', targetSets: 2, targetReps: 12 }],
      });
    });

    // Should delete old entries first
    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM routine_exercises WHERE routine_id = ?',
      ['r1'],
    );
    // Then insert the new one
    const insertCall = (db.runSync as jest.Mock).mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO routine_exercises'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![1]).toContain('e3');
  });

  it('deleteRoutine cascades to schedule_entries', () => {
    const db = createMockDb();

    // Mock for affectedSchedulesRows
    db.getAllSync.mockReturnValueOnce([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.deleteRoutine('r1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM schedule_entries WHERE routine_id = ?',
      ['r1'],
    );
  });

  it('deleteRoutine re-normalizes schedule_entries positions and clamps current_position', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);

    db.getAllSync.mockImplementation((query: string) => {
      if (query.includes('FROM routines')) return [];
      if (query.includes('DISTINCT schedule_id'))
        return [{ schedule_id: 's1' }];
      if (query.includes('WHERE schedule_id ='))
        return [{ id: 'se2' }, { id: 'se3' }];
      return [];
    });

    // SELECT schedule current_position
    db.getFirstSync.mockReturnValueOnce({ id: 's1', current_position: 2 });

    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.deleteRoutine('r1');
    });

    const updateEntryCalls = (db.runSync as jest.Mock).mock.calls.filter((c) =>
      (c[0] as string).includes('UPDATE schedule_entries SET position = ?'),
    );
    expect(updateEntryCalls).toHaveLength(2);
    expect(updateEntryCalls[0][1]).toEqual([0, 'se2']);
    expect(updateEntryCalls[1][1]).toEqual([1, 'se3']);

    const updateScheduleCall = (db.runSync as jest.Mock).mock.calls.find((c) =>
      (c[0] as string).includes('UPDATE schedules SET current_position = ?'),
    );
    expect(updateScheduleCall).toBeDefined();
    expect(updateScheduleCall![1]).toEqual([1, 's1']);
  });

  it('deleteRoutine cascades to routine_exercises', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.deleteRoutine('r1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM routine_exercises WHERE routine_id = ?',
      ['r1'],
    );
  });

  it('deleteRoutine deletes the routine itself', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.deleteRoutine('r1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM routines WHERE id = ?',
      ['r1'],
    );
  });

  it('deleteRoutine wraps all deletes in a single transaction', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    db.withTransactionSync.mockClear();

    act(() => {
      result.current.deleteRoutine('r1');
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('getRoutineExercises queries exercises for the given routine', () => {
    const db = createMockDb();
    const mockExercises: RoutineExercise[] = [
      {
        id: 're1',
        routine_id: 'r1',
        exercise_id: 'e1',
        position: 0,
        target_sets: 3,
        target_reps: 10,
      },
    ];
    db.getAllSync.mockReturnValue(mockExercises);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    let exercises: RoutineExercise[] = [];
    act(() => {
      exercises = result.current.getRoutineExercises('r1');
    });

    expect(exercises).toEqual(mockExercises);
    // The SQL should filter by routine_id
    const lastCall = (db.getAllSync as jest.Mock).mock.calls.at(-1);
    expect(lastCall![1]).toEqual(['r1']);
  });

  it('refresh() triggers a re-fetch', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });
    const callsBefore = (db.getAllSync as jest.Mock).mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    expect((db.getAllSync as jest.Mock).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
  });

  // ── State-update consistency tests ────────────────────────────────────────

  it('updateRoutine: routines list reflects the updated name after save', () => {
    const db = createMockDb();
    const original: Routine = { id: 'r1', name: 'Push A', notes: null };
    db.getAllSync.mockReturnValue([original]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    const updated: Routine = { ...original, name: 'Push B' };
    db.getAllSync.mockReturnValue([updated]);

    act(() => {
      result.current.updateRoutine('r1', { name: 'Push B', exercises: [] });
    });

    expect(result.current.routines[0].name).toBe('Push B');
  });

  it('updateRoutine: getRoutineExercises returns the new exercises after save', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    const newExercises: RoutineExercise[] = [
      {
        id: 're2',
        routine_id: 'r1',
        exercise_id: 'e2',
        position: 0,
        target_sets: 4,
        target_reps: 8,
      },
    ];
    db.getAllSync.mockReturnValue(newExercises);

    act(() => {
      result.current.updateRoutine('r1', {
        name: 'Push B',
        exercises: [{ exerciseId: 'e2', targetSets: 4, targetReps: 8 }],
      });
    });

    let exercises: RoutineExercise[] = [];
    act(() => {
      exercises = result.current.getRoutineExercises('r1');
    });

    expect(exercises).toEqual(newExercises);
    expect(exercises[0].exercise_id).toBe('e2');
  });

  it('deleteRoutine: routines list is empty after the only routine is deleted', () => {
    const db = createMockDb();
    const r1: Routine = { id: 'r1', name: 'Push A', notes: null };
    db.getAllSync.mockReturnValue([r1]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    db.getAllSync.mockReturnValue([]);

    act(() => {
      result.current.deleteRoutine('r1');
    });

    expect(result.current.routines).toEqual([]);
  });
});
