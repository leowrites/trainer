import {
  HISTORY_TREND_SQL,
  loadHistorySessionById,
  loadHistorySessionPage,
  loadHistoryTrendRows,
} from '../data/history-repository';
import type {
  HistorySessionRow,
  HistorySetRow,
  HistoryTrendSessionRow,
} from '../types';

describe('history repository', () => {
  it('loads one page of sessions, scopes set rows to that page, and reports more pages', () => {
    const sessionRows: HistorySessionRow[] = [
      {
        id: 'session-1',
        routine_id: 'routine-1',
        routine_name: 'Upper A',
        snapshot_name: 'Upper A',
        start_time: 3,
        end_time: 4,
      },
      {
        id: 'session-2',
        routine_id: 'routine-2',
        routine_name: 'Lower A',
        snapshot_name: 'Lower A',
        start_time: 2,
        end_time: 3,
      },
      {
        id: 'session-3',
        routine_id: 'routine-3',
        routine_name: 'Pull A',
        snapshot_name: 'Pull A',
        start_time: 1,
        end_time: 2,
      },
    ];
    const setRows: HistorySetRow[] = [
      {
        id: 'set-1',
        session_id: 'session-1',
        exercise_id: 'exercise-1',
        exercise_name: 'Bench Press',
        weight: 100,
        reps: 10,
        is_completed: 1,
        target_sets: 3,
        target_reps: 10,
      },
      {
        id: 'set-2',
        session_id: 'session-2',
        exercise_id: 'exercise-2',
        exercise_name: 'Squat',
        weight: 225,
        reps: 5,
        is_completed: 1,
        target_sets: 5,
        target_reps: 5,
      },
    ];
    const db = {
      getAllSync: jest
        .fn()
        .mockReturnValueOnce(sessionRows)
        .mockReturnValueOnce(setRows),
      getFirstSync: jest.fn(),
    };

    expect(loadHistorySessionPage(db, { limit: 2, offset: 5 })).toEqual({
      sessionRows: sessionRows.slice(0, 2),
      setRows,
      hasMore: true,
    });
    expect(db.getAllSync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('LIMIT ? OFFSET ?'),
      [3, 5],
    );
    expect(db.getAllSync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE wset.session_id IN (?, ?)'),
      ['session-1', 'session-2'],
    );
  });

  it('skips the set query when a page has no sessions', () => {
    const db = {
      getAllSync: jest.fn().mockReturnValueOnce([]),
      getFirstSync: jest.fn(),
    };

    expect(loadHistorySessionPage(db, { limit: 20, offset: 0 })).toEqual({
      sessionRows: [],
      setRows: [],
      hasMore: false,
    });
    expect(db.getAllSync).toHaveBeenCalledTimes(1);
  });

  it('loads one session and only its set rows for the detail screen', () => {
    const sessionRow: HistorySessionRow = {
      id: 'session-1',
      routine_id: 'routine-1',
      routine_name: 'Upper A',
      snapshot_name: 'Upper A',
      start_time: 1,
      end_time: 2,
    };
    const setRows: HistorySetRow[] = [
      {
        id: 'set-1',
        session_id: 'session-1',
        exercise_id: 'exercise-1',
        exercise_name: 'Bench Press',
        weight: 100,
        reps: 10,
        is_completed: 1,
        target_sets: 3,
        target_reps: 10,
      },
    ];
    const db = {
      getAllSync: jest.fn().mockReturnValue(setRows),
      getFirstSync: jest.fn().mockReturnValue(sessionRow),
    };

    expect(loadHistorySessionById(db, 'session-1')).toEqual({
      sessionRow,
      setRows,
    });
    expect(db.getFirstSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE ws.id = ?'),
      ['session-1'],
    );
    expect(db.getAllSync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE wset.session_id = ?'),
      ['session-1'],
    );
  });

  it('reads trend rows with the aggregate trend SQL query', () => {
    const trendRows: HistoryTrendSessionRow[] = [
      {
        id: 'session-1',
        start_time: 1,
        end_time: 2,
        total_volume: 3000,
        total_reps: 30,
        total_sets: 3,
        total_completed_sets: 3,
      },
    ];
    const db = {
      getAllSync: jest.fn().mockReturnValue(trendRows),
      getFirstSync: jest.fn(),
    };

    expect(loadHistoryTrendRows(db)).toEqual(trendRows);
    expect(db.getAllSync).toHaveBeenCalledWith(HISTORY_TREND_SQL);
  });
});
