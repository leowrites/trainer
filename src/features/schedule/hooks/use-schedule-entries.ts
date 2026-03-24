/**
 * Schedule entries hook.
 *
 * CALLING SPEC:
 * - `useScheduleEntries(scheduleId)` loads one ordered schedule entry list.
 * - Returns `entries`, `isLoading`, and `refresh()`.
 * - Side effects: SQLite reads only.
 */

import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { ScheduleEntry } from '@core/database/types';

export interface UseScheduleEntriesResult {
  entries: ScheduleEntry[];
  isLoading: boolean;
  refresh: () => void;
}

export function useScheduleEntries(
  scheduleId: string | null | undefined,
): UseScheduleEntriesResult {
  const db = useDatabase();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!scheduleId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setEntries(
      db.getAllSync<ScheduleEntry>(
        'SELECT id, schedule_id, routine_id, position FROM schedule_entries WHERE schedule_id = ? ORDER BY position ASC',
        [scheduleId],
      ),
    );
    setIsLoading(false);
  }, [db, refreshKey, scheduleId]);

  return {
    entries,
    isLoading,
    refresh,
  };
}
