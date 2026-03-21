import { act, renderHook } from '@testing-library/react-native';

import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';
import { HISTORY_TREND_SQL } from '../data/history-repository';
import { useHistoryAnalytics } from '../hooks/use-history-analytics';
import type {
  HistorySessionRow,
  HistorySetRow,
  HistoryTrendSessionRow,
} from '../types';

function buildSessionRow(index: number): HistorySessionRow {
  return {
    id: `session-${index}`,
    routine_id: `routine-${index}`,
    routine_name: `Routine ${index}`,
    snapshot_name: `Routine ${index}`,
    start_time: 1_700_000_000_000 - index * 60_000,
    end_time: 1_700_000_000_000 - index * 30_000,
  };
}

function buildSetRow(sessionId: string, index: number): HistorySetRow {
  return {
    id: `set-${sessionId}-${index}`,
    session_id: sessionId,
    exercise_id: `exercise-${index}`,
    exercise_name: `Exercise ${index}`,
    weight: 100 + index,
    reps: 8,
    is_completed: 1,
    target_sets: 3,
    target_reps: 8,
  };
}

describe('useHistoryAnalytics', () => {
  it('loads the first page, appends the next page, and stops when there are no more pages', () => {
    const db = createMockDb();
    const trendRows: HistoryTrendSessionRow[] = Array.from(
      { length: 21 },
      (_, index) => ({
        id: `session-${index + 1}`,
        start_time: 1_700_000_000_000 - index * 60_000,
        end_time: 1_700_000_000_000 - index * 30_000,
        total_volume: 3000,
        total_reps: 24,
        total_sets: 3,
        total_completed_sets: 3,
      }),
    );
    const firstPageRows = Array.from({ length: 21 }, (_, index) =>
      buildSessionRow(index + 1),
    );
    const secondPageRows = [buildSessionRow(22)];

    db.getAllSync.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql === HISTORY_TREND_SQL) {
        return trendRows;
      }

      if (sql.includes('LIMIT ? OFFSET ?')) {
        return params?.[1] === 0 ? firstPageRows : secondPageRows;
      }

      if (sql.includes('WHERE wset.session_id IN')) {
        return (params as string[]).map((sessionId, index) =>
          buildSetRow(sessionId, index + 1),
        );
      }

      return [];
    });

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHistoryAnalytics(), { wrapper });

    expect(result.current.sessions).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.sessions).toHaveLength(21);
    expect(result.current.hasMore).toBe(false);

    const pageQueryCount = db.getAllSync.mock.calls.filter(([sql]) =>
      String(sql).includes('LIMIT ? OFFSET ?'),
    ).length;

    act(() => {
      result.current.loadMore();
    });

    expect(
      db.getAllSync.mock.calls.filter(([sql]) =>
        String(sql).includes('LIMIT ? OFFSET ?'),
      ).length,
    ).toBe(pageQueryCount);
  });

  it('refresh resets the paginated session list back to the first page', () => {
    const db = createMockDb();
    const trendRows: HistoryTrendSessionRow[] = Array.from(
      { length: 25 },
      (_, index) => ({
        id: `session-${index + 1}`,
        start_time: 1_700_000_000_000 - index * 60_000,
        end_time: 1_700_000_000_000 - index * 30_000,
        total_volume: 3000,
        total_reps: 24,
        total_sets: 3,
        total_completed_sets: 3,
      }),
    );
    const firstPageRows = Array.from({ length: 21 }, (_, index) =>
      buildSessionRow(index + 1),
    );
    const secondPageRows = Array.from({ length: 5 }, (_, index) =>
      buildSessionRow(index + 22),
    );

    db.getAllSync.mockImplementation((sql: string, params?: unknown[]) => {
      if (sql === HISTORY_TREND_SQL) {
        return trendRows;
      }

      if (sql.includes('LIMIT ? OFFSET ?')) {
        return params?.[1] === 0 ? firstPageRows : secondPageRows;
      }

      if (sql.includes('WHERE wset.session_id IN')) {
        return (params as string[]).map((sessionId, index) =>
          buildSetRow(sessionId, index + 1),
        );
      }

      return [];
    });

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useHistoryAnalytics(), { wrapper });

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.sessions).toHaveLength(25);

    act(() => {
      result.current.refresh();
    });

    expect(result.current.sessions).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);
  });
});
