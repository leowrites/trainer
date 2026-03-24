/**
 * Schedule entry index hook.
 *
 * CALLING SPEC:
 * - `useScheduleEntryIndex()` loads ordered entries for every schedule.
 * - Returns a map keyed by `schedule_id` plus `refresh()`.
 * - Side effects: SQLite reads only.
 */

import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { ScheduleEntry } from '@core/database/types';

export interface UseScheduleEntryIndexResult {
  entriesByScheduleId: Record<string, ScheduleEntry[]>;
  refresh: () => void;
}

export function useScheduleEntryIndex(): UseScheduleEntryIndexResult {
  const db = useDatabase();
  const [entriesByScheduleId, setEntriesByScheduleId] = useState<
    Record<string, ScheduleEntry[]>
  >({});
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const rows = db.getAllSync<ScheduleEntry>(
      'SELECT id, schedule_id, routine_id, position FROM schedule_entries ORDER BY schedule_id ASC, position ASC',
    );
    const nextEntriesByScheduleId = rows.reduce<
      Record<string, ScheduleEntry[]>
    >((accumulator, row) => {
      const entries = accumulator[row.schedule_id] ?? [];
      entries.push(row);
      accumulator[row.schedule_id] = entries;
      return accumulator;
    }, {});

    setEntriesByScheduleId(nextEntriesByScheduleId);
  }, [db, refreshKey]);

  return {
    entriesByScheduleId,
    refresh,
  };
}
