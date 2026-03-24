/**
 * Routine insight hook.
 *
 * CALLING SPEC:
 * - `useRoutineInsight(routineId)` loads one routine history insight model.
 * - Returns `insight`, `isLoading`, and `refresh()`.
 * - Side effects: SQLite reads only.
 */

import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';

export interface RoutineProgressSession {
  sessionId: string;
  routineName: string;
  startTime: number;
  endTime: number | null;
  totalVolume: number;
  completedSets: number;
  totalSets: number;
}

export interface RoutineInsight {
  completionCount: number;
  lastPerformedAt: number | null;
  averageVolume: number | null;
  averageDurationMinutes: number | null;
  recentSessions: RoutineProgressSession[];
}

interface RoutineSessionRow {
  session_id: string;
  routine_name: string | null;
  start_time: number;
  end_time: number | null;
  total_volume: number;
  completed_sets: number;
  total_sets: number;
}

function formatSessionName(value: string | null): string {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue === '' ? 'Workout' : trimmedValue;
}

function buildEmptyRoutineInsight(): RoutineInsight {
  return {
    completionCount: 0,
    lastPerformedAt: null,
    averageVolume: null,
    averageDurationMinutes: null,
    recentSessions: [],
  };
}

function loadRoutineInsight(
  db: ReturnType<typeof useDatabase>,
  routineId: string,
): RoutineInsight {
  const rows = db.getAllSync<RoutineSessionRow>(
    `
      SELECT
        ws.id AS session_id,
        COALESCE(r.name, ws.snapshot_name, 'Workout') AS routine_name,
        ws.start_time,
        ws.end_time,
        COALESCE(SUM(CASE WHEN wset.is_completed = 1 THEN wset.weight * wset.reps ELSE 0 END), 0) AS total_volume,
        COALESCE(SUM(CASE WHEN wset.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_sets,
        COUNT(wset.id) AS total_sets
      FROM workout_sessions ws
      LEFT JOIN routines r ON r.id = ws.routine_id
      LEFT JOIN workout_sets wset ON wset.session_id = ws.id
      WHERE ws.routine_id = ?
      GROUP BY ws.id, routine_name, ws.start_time, ws.end_time
      ORDER BY ws.start_time DESC
    `,
    [routineId],
  );

  if (rows.length === 0) {
    return buildEmptyRoutineInsight();
  }

  const recentSessions = rows.map((row) => ({
    sessionId: row.session_id,
    routineName: formatSessionName(row.routine_name),
    startTime: row.start_time,
    endTime: row.end_time,
    totalVolume: row.total_volume,
    completedSets: row.completed_sets,
    totalSets: row.total_sets,
  }));

  const volumeTotal = recentSessions.reduce(
    (sum, session) => sum + session.totalVolume,
    0,
  );
  const durationValues = recentSessions
    .filter((session) => session.endTime !== null)
    .map((session) =>
      Math.max(
        0,
        Math.round(
          ((session.endTime ?? session.startTime) - session.startTime) / 60_000,
        ),
      ),
    );
  const durationTotal = durationValues.reduce((sum, value) => sum + value, 0);

  return {
    completionCount: recentSessions.length,
    lastPerformedAt: recentSessions[0]?.startTime ?? null,
    averageVolume: volumeTotal / recentSessions.length,
    averageDurationMinutes:
      durationValues.length > 0 ? durationTotal / durationValues.length : null,
    recentSessions,
  };
}

export interface UseRoutineInsightResult {
  insight: RoutineInsight;
  isLoading: boolean;
  refresh: () => void;
}

export function useRoutineInsight(
  routineId: string | null | undefined,
): UseRoutineInsightResult {
  const db = useDatabase();
  const [insight, setInsight] = useState<RoutineInsight>(
    buildEmptyRoutineInsight(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!routineId) {
      setInsight(buildEmptyRoutineInsight());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setInsight(loadRoutineInsight(db, routineId));
    setIsLoading(false);
  }, [db, refreshKey, routineId]);

  return {
    insight,
    isLoading,
    refresh,
  };
}
