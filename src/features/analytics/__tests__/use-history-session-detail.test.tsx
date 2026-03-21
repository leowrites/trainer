import { renderHook } from '@testing-library/react-native';

import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';
import { useHistorySessionDetail } from '../hooks/use-history-session-detail';
import type { HistorySession } from '../types';

describe('useHistorySessionDetail', () => {
  it('loads one session from the repository and replaces the optimistic session if missing', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(null);

    const wrapper = createDatabaseWrapper(db);
    const initialSession: HistorySession = {
      id: 'session-1',
      routineId: 'routine-1',
      routineName: 'Upper A',
      startTime: 1,
      endTime: 2,
      durationMinutes: 1,
      totalSets: 1,
      totalCompletedSets: 1,
      totalReps: 10,
      totalVolume: 1000,
      exerciseCount: 1,
      exercises: [],
    };

    const { result } = renderHook(
      () => useHistorySessionDetail('session-1', initialSession),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
  });
});
