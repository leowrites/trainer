import { act, renderHook } from '@testing-library/react-native';

import {
  createDatabaseWrapper,
  createMockDb,
} from '@core/database/__tests__/test-utils';
import { useAnalytics } from '../hooks/use-analytics';

// ─── useAnalytics ─────────────────────────────────────────────────────────────

describe('useAnalytics', () => {
  it('returns empty arrays when the DB has no data', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });

    expect(result.current.volumeData).toEqual([]);
    expect(result.current.hoursData).toEqual([]);
  });

  it('queries the correct tables on mount', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    renderHook(() => useAnalytics(30), { wrapper });

    const calls: string[] = (db.getAllSync as jest.Mock).mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );

    // Expect at least one call involving workout_sessions JOIN workout_sets (volume)
    expect(calls.some((sql) => sql.includes('workout_sets'))).toBe(true);
    // Expect at least one call for the hours query
    expect(calls.some((sql) => sql.includes('workout_sessions'))).toBe(true);
  });

  it('passes a startMs timestamp parameter derived from daysBack', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);

    const beforeMs = Date.now();
    renderHook(() => useAnalytics(7), { wrapper });
    const afterMs = Date.now();

    const params: number[] = (db.getAllSync as jest.Mock).mock.calls.map(
      (c: unknown[]) => (c[1] as number[])[0],
    );

    const expectedLow = beforeMs - 7 * 24 * 60 * 60 * 1000;
    const expectedHigh = afterMs - 7 * 24 * 60 * 60 * 1000;

    params.forEach((param) => {
      expect(param).toBeGreaterThanOrEqual(expectedLow);
      expect(param).toBeLessThanOrEqual(expectedHigh);
    });
  });

  it('transforms volume DB rows into VolumeDataPoints', () => {
    const db = createMockDb();
    // First getAllSync call = volume query, second = hours query
    db.getAllSync
      .mockReturnValueOnce([
        { session_date: '2024-03-01', total_volume: 2000 },
        { session_date: '2024-03-02', total_volume: 3000 },
      ])
      .mockReturnValueOnce([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });

    expect(result.current.volumeData).toHaveLength(2);
    expect(result.current.volumeData[0].volume).toBe(2000);
    expect(result.current.volumeData[1].volume).toBe(3000);
    expect(typeof result.current.volumeData[0].label).toBe('string');
  });

  it('transforms hours DB rows into HoursDataPoints', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValueOnce([]).mockReturnValueOnce([
      { session_date: '2024-03-01', total_duration_ms: 3_600_000 },
      { session_date: '2024-03-02', total_duration_ms: 5_400_000 },
    ]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });

    expect(result.current.hoursData).toHaveLength(2);
    expect(result.current.hoursData[0].hours).toBe(1);
    expect(result.current.hoursData[1].hours).toBe(1.5);
  });

  it('re-queries the DB when refresh() is called', () => {
    const db = createMockDb();
    db.getAllSync.mockReturnValue([]);
    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });

    const callCountBefore = (db.getAllSync as jest.Mock).mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    expect((db.getAllSync as jest.Mock).mock.calls.length).toBeGreaterThan(
      callCountBefore,
    );
  });
});
