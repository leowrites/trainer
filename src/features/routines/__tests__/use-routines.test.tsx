import { renderHook, act } from '@testing-library/react-native';

import type { Routine } from '@core/database/types';
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
    expect(result.current.hasLoaded).toBe(true);
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
    expect(result.current.hasLoaded).toBe(true);
  });

  it('createRoutine inserts the routine row', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.createRoutine({ name: 'Push A', exercises: [] });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT INTO routines (id, name, notes, is_deleted) VALUES (?, ?, ?, 0)',
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
      'UPDATE routines SET name = ? WHERE id = ? AND is_deleted = 0',
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

    // Mock getFirstSync for COUNT(*) and original current_position
    db.getFirstSync.mockImplementation((query: string) => {
      if (query.includes('COUNT(*)')) return { count: 1 };
      if (query.includes('FROM schedules'))
        return { id: 's1', current_position: 2 };
      return null;
    });

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

  it('deleteRoutine archives the routine row instead of deleting it', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useRoutines(), { wrapper });

    act(() => {
      result.current.deleteRoutine('r1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE routines SET is_deleted = 1 WHERE id = ?',
      ['r1'],
    );
    expect(db.runSync).not.toHaveBeenCalledWith(
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
