import { renderHook, act } from '@testing-library/react-native';

import type { Schedule, ScheduleEntry } from '@core/database/types';
import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';
import { useSchedules } from '../hooks/use-schedules';

// ─── useSchedules ─────────────────────────────────────────────────────────────

describe('useSchedules', () => {
  it('returns an empty list on mount when DB has no schedules', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });
    expect(result.current.schedules).toEqual([]);
  });

  it('returns schedules fetched from the DB on mount', () => {
    const db = createMockDb();
    const mockRows: Schedule[] = [
      { id: 's1', name: 'Push/Pull', is_active: 0, current_position: -1 },
    ];
    db.getAllSync.mockReturnValue(mockRows);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });
    expect(result.current.schedules).toEqual(mockRows);
  });

  it('createSchedule inserts the schedule row', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    act(() => {
      result.current.createSchedule({ name: 'My Schedule', routineIds: [] });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT INTO schedules (id, name, is_active, current_position) VALUES (?, ?, 0, -1)',
      expect.arrayContaining(['My Schedule']),
    );
  });

  it('createSchedule inserts schedule_entries for each routineId', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    act(() => {
      result.current.createSchedule({
        name: 'Push/Pull',
        routineIds: ['r1', 'r2', 'r3'],
      });
    });

    const entryCalls = (db.runSync as jest.Mock).mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO schedule_entries'),
    );
    expect(entryCalls).toHaveLength(3);
    // Verify positions are 0, 1, 2
    expect(entryCalls[0][1]).toContain(0);
    expect(entryCalls[1][1]).toContain(1);
    expect(entryCalls[2][1]).toContain(2);
  });

  it('createSchedule wraps writes in a transaction', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    db.withTransactionSync.mockClear();

    act(() => {
      result.current.createSchedule({ name: 'Test', routineIds: ['r1'] });
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('createSchedule returns the new schedule with is_active=0 and current_position=-1', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    let created: Schedule | undefined;
    act(() => {
      created = result.current.createSchedule({
        name: 'Push/Pull',
        routineIds: [],
      });
    });

    expect(created).toMatchObject({
      name: 'Push/Pull',
      is_active: 0,
      current_position: -1,
    });
  });

  it('setActiveSchedule deactivates all others and activates the target', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    act(() => {
      result.current.setActiveSchedule('s1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE schedules SET is_active = 0 WHERE id != ?',
      ['s1'],
    );
    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE schedules SET is_active = 1 WHERE id = ?',
      ['s1'],
    );
  });

  it('setActiveSchedule wraps both updates in a transaction', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    db.withTransactionSync.mockClear();

    act(() => {
      result.current.setActiveSchedule('s1');
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('updateSchedule updates the name and resets current_position to -1', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    act(() => {
      result.current.updateSchedule('s1', {
        name: 'New Name',
        routineIds: [],
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE schedules SET name = ?, current_position = -1 WHERE id = ?',
      ['New Name', 's1'],
    );
  });

  it('updateSchedule replaces entries (delete then re-insert)', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    act(() => {
      result.current.updateSchedule('s1', {
        name: 'Updated',
        routineIds: ['r1', 'r2'],
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM schedule_entries WHERE schedule_id = ?',
      ['s1'],
    );
    const insertCalls = (db.runSync as jest.Mock).mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO schedule_entries'),
    );
    expect(insertCalls).toHaveLength(2);
  });

  it('deleteSchedule removes schedule_entries then the schedule', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    act(() => {
      result.current.deleteSchedule('s1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM schedule_entries WHERE schedule_id = ?',
      ['s1'],
    );
    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM schedules WHERE id = ?',
      ['s1'],
    );
  });

  it('deleteSchedule wraps both deletes in a transaction', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    db.withTransactionSync.mockClear();

    act(() => {
      result.current.deleteSchedule('s1');
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('getScheduleEntries queries entries for the given schedule', () => {
    const db = createMockDb();
    const mockEntries: ScheduleEntry[] = [
      { id: 'se1', schedule_id: 's1', routine_id: 'r1', position: 0 },
    ];
    db.getAllSync.mockReturnValue(mockEntries);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });

    let entries: ScheduleEntry[] = [];
    act(() => {
      entries = result.current.getScheduleEntries('s1');
    });

    expect(entries).toEqual(mockEntries);
    const lastCall = (db.getAllSync as jest.Mock).mock.calls.at(-1);
    expect(lastCall![1]).toEqual(['s1']);
  });

  it('refresh() triggers a re-fetch', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useSchedules(), { wrapper });
    const callsBefore = (db.getAllSync as jest.Mock).mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    expect((db.getAllSync as jest.Mock).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
  });
});
