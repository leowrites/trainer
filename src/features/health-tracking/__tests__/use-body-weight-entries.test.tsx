import { act, renderHook } from '@testing-library/react-native';

import {
  createDatabaseWrapper,
  createMockDb,
} from '@core/database/__tests__/test-utils';
import type { BodyWeightEntryRow } from '../domain/body-weight';
import { useBodyWeightEntries } from '../hooks/use-body-weight-entries';

const LIST_BODY_WEIGHT_ENTRIES_SQL =
  'SELECT id, weight, unit, logged_at, notes FROM body_weight_entries ORDER BY logged_at DESC, id DESC';
const INSERT_BODY_WEIGHT_ENTRY_SQL =
  'INSERT INTO body_weight_entries (id, weight, unit, logged_at, notes) VALUES (?, ?, ?, ?, ?)';
const UPDATE_BODY_WEIGHT_ENTRY_SQL =
  'UPDATE body_weight_entries SET weight = ?, unit = ?, logged_at = ?, notes = ? WHERE id = ?';
const DELETE_BODY_WEIGHT_ENTRY_SQL =
  'DELETE FROM body_weight_entries WHERE id = ?';

describe('useBodyWeightEntries', () => {
  function createSeededDb(): ReturnType<typeof createMockDb> {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue({ count: 1 });
    return db;
  }

  it('loads persisted body-weight entries on mount', () => {
    const db = createSeededDb();
    const rows: BodyWeightEntryRow[] = [
      {
        id: 'weight-2',
        weight: 72.6,
        unit: 'kg',
        logged_at: 1710685800000,
        notes: 'Post-workout',
      },
      {
        id: 'weight-1',
        weight: 72.2,
        unit: 'kg',
        logged_at: 1710599400000,
        notes: null,
      },
    ];

    db.getAllSync.mockReturnValue(rows);

    const { result } = renderHook(() => useBodyWeightEntries(), {
      wrapper: createDatabaseWrapper(db),
    });

    expect(db.getAllSync).toHaveBeenCalledWith(LIST_BODY_WEIGHT_ENTRIES_SQL);
    expect(result.current.entries).toEqual([
      {
        id: 'weight-2',
        weight: 72.6,
        unit: 'kg',
        loggedAt: 1710685800000,
        notes: 'Post-workout',
      },
      {
        id: 'weight-1',
        weight: 72.2,
        unit: 'kg',
        loggedAt: 1710599400000,
        notes: null,
      },
    ]);
  });

  it('createEntry inserts a new row and trims empty notes to null', () => {
    const db = createSeededDb();
    db.getAllSync.mockReturnValue([]);

    const { result } = renderHook(() => useBodyWeightEntries(), {
      wrapper: createDatabaseWrapper(db),
    });

    act(() => {
      result.current.createEntry({
        weight: 181.6,
        unit: 'lb',
        loggedAt: 1710685800000,
        notes: '  ',
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(
      INSERT_BODY_WEIGHT_ENTRY_SQL,
      expect.arrayContaining([181.6, 'lb', 1710685800000, null]),
    );
    expect((db.getAllSync as jest.Mock).mock.calls.length).toBeGreaterThan(1);
  });

  it('updateEntry updates an existing body-weight row', () => {
    const db = createSeededDb();
    db.getAllSync.mockReturnValue([]);

    const { result } = renderHook(() => useBodyWeightEntries(), {
      wrapper: createDatabaseWrapper(db),
    });

    act(() => {
      result.current.updateEntry('weight-1', {
        weight: 72.9,
        unit: 'kg',
        loggedAt: 1710685800000,
        notes: 'Evening',
      });
    });

    expect(db.runSync).toHaveBeenCalledWith(UPDATE_BODY_WEIGHT_ENTRY_SQL, [
      72.9,
      'kg',
      1710685800000,
      'Evening',
      'weight-1',
    ]);
  });

  it('deleteEntry removes a body-weight row by id', () => {
    const db = createSeededDb();
    db.getAllSync.mockReturnValue([]);

    const { result } = renderHook(() => useBodyWeightEntries(), {
      wrapper: createDatabaseWrapper(db),
    });

    act(() => {
      result.current.deleteEntry('weight-1');
    });

    expect(db.runSync).toHaveBeenCalledWith(DELETE_BODY_WEIGHT_ENTRY_SQL, [
      'weight-1',
    ]);
  });

  it('returns a load error instead of crashing when the table is unavailable', () => {
    const db = createSeededDb();
    db.getAllSync.mockImplementation(() => {
      throw new Error('no such table: body_weight_entries');
    });
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() => useBodyWeightEntries(), {
      wrapper: createDatabaseWrapper(db),
    });

    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBe('Unable to load body-weight history.');

    consoleErrorSpy.mockRestore();
  });
});
