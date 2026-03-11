import { renderHook, act } from '@testing-library/react-native';

import type {
  ActivityLog,
  BodyWeightLog,
  StepCountLog,
} from '@core/database/types';
import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';
import { useHealthTracking } from '../hooks/use-health-tracking';

// ─── useHealthTracking ────────────────────────────────────────────────────────

describe('useHealthTracking', () => {
  // ── Initial state ──────────────────────────────────────────────────────────

  it('returns empty lists when DB has no records', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    expect(result.current.bodyWeightLogs).toEqual([]);
    expect(result.current.stepCountLogs).toEqual([]);
    expect(result.current.activityLogs).toEqual([]);
  });

  it('loads body weight logs from the DB on mount', () => {
    const db = createMockDb();
    const rows: BodyWeightLog[] = [
      { id: 'bw1', date: '2025-01-01', weight_kg: 75.5 },
    ];
    db.getAllSync.mockReturnValue(rows);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    expect(result.current.bodyWeightLogs).toEqual(rows);
  });

  it('loads step count logs from the DB on mount', () => {
    const db = createMockDb();
    const rows: StepCountLog[] = [
      { id: 'sc1', date: '2025-01-01', step_count: 8500 },
    ];
    db.getAllSync.mockReturnValue(rows);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    expect(result.current.stepCountLogs).toEqual(rows);
  });

  it('loads activity logs from the DB on mount', () => {
    const db = createMockDb();
    const rows: ActivityLog[] = [
      {
        id: 'al1',
        date: '2025-01-01',
        activity_type: 'Running',
        duration_minutes: 30,
        notes: null,
      },
    ];
    db.getAllSync.mockReturnValue(rows);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    expect(result.current.activityLogs).toEqual(rows);
  });

  // ── Body weight CRUD ───────────────────────────────────────────────────────

  it('createBodyWeightLog inserts into body_weight_logs', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.createBodyWeightLog({
        date: '2025-01-01',
        weight_kg: 80.0,
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT INTO body_weight_logs (id, date, weight_kg) VALUES (?, ?, ?)',
      expect.arrayContaining(['2025-01-01', 80.0]),
    );
  });

  it('createBodyWeightLog returns the new log object', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    let created: BodyWeightLog | undefined;
    act(() => {
      created = result.current.createBodyWeightLog({
        date: '2025-01-02',
        weight_kg: 79.5,
      });
    });

    expect(created).toMatchObject({ date: '2025-01-02', weight_kg: 79.5 });
    expect(typeof created?.id).toBe('string');
  });

  it('updateBodyWeightLog updates date when provided', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.updateBodyWeightLog('bw1', { date: '2025-02-01' });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE body_weight_logs SET date = ? WHERE id = ?',
      ['2025-02-01', 'bw1'],
    );
  });

  it('updateBodyWeightLog updates weight_kg when provided', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.updateBodyWeightLog('bw1', { weight_kg: 77.0 });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE body_weight_logs SET weight_kg = ? WHERE id = ?',
      [77.0, 'bw1'],
    );
  });

  it('updateBodyWeightLog wraps writes in a transaction', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    db.withTransactionSync.mockClear();
    act(() => {
      result.current.updateBodyWeightLog('bw1', {
        date: '2025-02-01',
        weight_kg: 77.0,
      });
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('deleteBodyWeightLog deletes the record', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.deleteBodyWeightLog('bw1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM body_weight_logs WHERE id = ?',
      ['bw1'],
    );
  });

  // ── Step count CRUD ────────────────────────────────────────────────────────

  it('createStepCountLog inserts into step_count_logs', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.createStepCountLog({
        date: '2025-01-01',
        step_count: 10000,
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT INTO step_count_logs (id, date, step_count) VALUES (?, ?, ?)',
      expect.arrayContaining(['2025-01-01', 10000]),
    );
  });

  it('createStepCountLog returns the new log object', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    let created: StepCountLog | undefined;
    act(() => {
      created = result.current.createStepCountLog({
        date: '2025-01-03',
        step_count: 7500,
      });
    });

    expect(created).toMatchObject({ date: '2025-01-03', step_count: 7500 });
    expect(typeof created?.id).toBe('string');
  });

  it('updateStepCountLog updates step_count when provided', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.updateStepCountLog('sc1', { step_count: 12000 });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE step_count_logs SET step_count = ? WHERE id = ?',
      [12000, 'sc1'],
    );
  });

  it('updateStepCountLog wraps writes in a transaction', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    db.withTransactionSync.mockClear();
    act(() => {
      result.current.updateStepCountLog('sc1', {
        date: '2025-02-01',
        step_count: 12000,
      });
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('deleteStepCountLog deletes the record', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.deleteStepCountLog('sc1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM step_count_logs WHERE id = ?',
      ['sc1'],
    );
  });

  // ── Activity log CRUD ──────────────────────────────────────────────────────

  it('createActivityLog inserts into activity_logs', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.createActivityLog({
        date: '2025-01-01',
        activity_type: 'Cycling',
        duration_minutes: 45,
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'INSERT INTO activity_logs (id, date, activity_type, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)',
      expect.arrayContaining(['2025-01-01', 'Cycling', 45]),
    );
  });

  it('createActivityLog returns the new log object', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    let created: ActivityLog | undefined;
    act(() => {
      created = result.current.createActivityLog({
        date: '2025-01-04',
        activity_type: 'Swimming',
        duration_minutes: 60,
        notes: 'Morning swim',
      });
    });

    expect(created).toMatchObject({
      date: '2025-01-04',
      activity_type: 'Swimming',
      duration_minutes: 60,
      notes: 'Morning swim',
    });
    expect(typeof created?.id).toBe('string');
  });

  it('createActivityLog stores null notes when notes is omitted', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    let created: ActivityLog | undefined;
    act(() => {
      created = result.current.createActivityLog({
        date: '2025-01-05',
        activity_type: 'Yoga',
        duration_minutes: 30,
      });
    });

    expect(created?.notes).toBeNull();
  });

  it('updateActivityLog updates activity_type when provided', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.updateActivityLog('al1', { activity_type: 'Hiking' });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE activity_logs SET activity_type = ? WHERE id = ?',
      ['Hiking', 'al1'],
    );
  });

  it('updateActivityLog updates duration_minutes when provided', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.updateActivityLog('al1', { duration_minutes: 90 });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE activity_logs SET duration_minutes = ? WHERE id = ?',
      [90, 'al1'],
    );
  });

  it('updateActivityLog updates notes when provided', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.updateActivityLog('al1', { notes: 'Updated note' });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'UPDATE activity_logs SET notes = ? WHERE id = ?',
      ['Updated note', 'al1'],
    );
  });

  it('updateActivityLog wraps writes in a transaction', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    db.withTransactionSync.mockClear();
    act(() => {
      result.current.updateActivityLog('al1', {
        activity_type: 'Hiking',
        duration_minutes: 90,
      });
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('deleteActivityLog deletes the record', () => {
    const db = createMockDb();
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    act(() => {
      result.current.deleteActivityLog('al1');
    });

    expect(db.runSync).toHaveBeenCalledWith(
      'DELETE FROM activity_logs WHERE id = ?',
      ['al1'],
    );
  });

  // ── Refresh ────────────────────────────────────────────────────────────────

  it('refresh() triggers a re-fetch from the DB', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });
    const callsBefore = (db.getAllSync as jest.Mock).mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    expect((db.getAllSync as jest.Mock).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );
  });

  // ── State consistency ──────────────────────────────────────────────────────

  it('bodyWeightLogs reflects the new entry after create', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    const newLog: BodyWeightLog = {
      id: 'bw-new',
      date: '2025-03-01',
      weight_kg: 74.0,
    };
    db.getAllSync.mockReturnValue([newLog]);

    act(() => {
      result.current.createBodyWeightLog({
        date: '2025-03-01',
        weight_kg: 74.0,
      });
    });

    expect(result.current.bodyWeightLogs).toEqual([newLog]);
  });

  it('stepCountLogs is empty after the only entry is deleted', () => {
    const db = createMockDb();
    const existing: StepCountLog = {
      id: 'sc1',
      date: '2025-01-01',
      step_count: 9000,
    };
    db.getAllSync.mockReturnValue([existing]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHealthTracking(), { wrapper });

    db.getAllSync.mockReturnValue([]);

    act(() => {
      result.current.deleteStepCountLog('sc1');
    });

    expect(result.current.stepCountLogs).toEqual([]);
  });
});
