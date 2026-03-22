/**
 * Daily step query hook.
 *
 * CALLING SPEC:
 *   const { entries, error, refresh } = useDailyStepEntries()
 *
 * Inputs:
 *   - None.
 * Outputs:
 *   - Recent imported daily-step rows from SQLite.
 * Side effects:
 *   - Reads from SQLite when refreshed or mounted.
 */
import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { DailyStepEntry, DailyStepEntryRow } from '../domain/daily-steps';
import { DAILY_STEP_TABLE, mapDailyStepEntry } from '../domain/daily-steps';

const LIST_DAILY_STEP_ENTRIES_SQL = `SELECT id, day_key, step_count, source, source_record_id, imported_at FROM ${DAILY_STEP_TABLE} ORDER BY day_key DESC, id DESC LIMIT 7`;

export function useDailyStepEntries(): {
  entries: DailyStepEntry[];
  error: string | null;
  refresh: () => void;
} {
  const db = useDatabase();
  const [entries, setEntries] = useState<DailyStepEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    try {
      const rows = db.getAllSync<DailyStepEntryRow>(
        LIST_DAILY_STEP_ENTRIES_SQL,
      );
      setEntries(rows.map(mapDailyStepEntry));
      setError(null);
    } catch (loadError) {
      console.error(
        '[HealthTracking] Failed to load imported daily step entries:',
        loadError,
      );
      setEntries([]);
      setError('Unable to load imported step history.');
    }
  }, [db, refreshKey]);

  return {
    entries,
    error,
    refresh,
  };
}
