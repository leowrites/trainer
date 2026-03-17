import {
  HISTORY_SESSIONS_SQL,
  HISTORY_SETS_SQL,
  loadHistoryRows,
} from '../data/history-repository';
import type { HistorySessionRow, HistorySetRow } from '../types';

describe('loadHistoryRows', () => {
  it('reads session rows and set rows with the analytics SQL queries', () => {
    const sessionRows: HistorySessionRow[] = [
      {
        id: 'session-1',
        routine_id: 'routine-1',
        routine_name: 'Upper A',
        snapshot_name: 'Upper A',
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
    ];
    const db = {
      getAllSync: jest
        .fn()
        .mockReturnValueOnce(sessionRows)
        .mockReturnValueOnce(setRows),
    };

    expect(loadHistoryRows(db)).toEqual({ sessionRows, setRows });
    expect(db.getAllSync).toHaveBeenNthCalledWith(1, HISTORY_SESSIONS_SQL);
    expect(db.getAllSync).toHaveBeenNthCalledWith(2, HISTORY_SETS_SQL);
  });
});
