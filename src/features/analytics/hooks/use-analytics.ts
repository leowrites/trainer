import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import {
  toHoursDataPoints,
  type HoursDataPoint,
  type HoursDataRow,
} from '../domain/hours-over-time';
import {
  toVolumeDataPoints,
  type VolumeDataPoint,
  type VolumeDataRow,
} from '../domain/volume-over-time';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_DAYS_BACK = 30;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches and aggregates analytics data from the local SQLite database.
 *
 * Returns:
 * - `volumeData` — daily tonnage (weight × reps) for completed sets over
 *   the last `daysBack` days, ready for charting.
 * - `hoursData`  — daily workout duration in hours over the same window.
 * - `refresh`    — manually re-queries the database.
 *
 * All data comes exclusively from expo-sqlite (offline-first).
 */
export function useAnalytics(daysBack: number = DEFAULT_DAYS_BACK): {
  volumeData: VolumeDataPoint[];
  hoursData: HoursDataPoint[];
  refresh: () => void;
} {
  const db = useDatabase();
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);
  const [hoursData, setHoursData] = useState<HoursDataPoint[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const startMs = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    // Volume: sum(weight × reps) for completed sets, grouped by calendar day.
    const volumeRows = db.getAllSync<VolumeDataRow>(
      `SELECT
         date(ws.start_time / 1000, 'unixepoch') AS session_date,
         COALESCE(SUM(wset.weight * wset.reps), 0) AS total_volume
       FROM workout_sessions ws
       JOIN workout_sets wset ON wset.session_id = ws.id
       WHERE wset.is_completed = 1
         AND ws.end_time IS NOT NULL
         AND ws.start_time >= ?
       GROUP BY session_date
       ORDER BY session_date ASC`,
      [startMs],
    );

    // Hours: sum(end_time − start_time) per calendar day.
    const hoursRows = db.getAllSync<HoursDataRow>(
      `SELECT
         date(start_time / 1000, 'unixepoch') AS session_date,
         SUM(end_time - start_time) AS total_duration_ms
       FROM workout_sessions
       WHERE end_time IS NOT NULL
         AND start_time >= ?
       GROUP BY session_date
       ORDER BY session_date ASC`,
      [startMs],
    );

    setVolumeData(toVolumeDataPoints(volumeRows));
    setHoursData(toHoursDataPoints(hoursRows));
  }, [db, daysBack, refreshKey]);

  return { volumeData, hoursData, refresh };
}
