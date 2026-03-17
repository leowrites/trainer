import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { loadHistoryRows } from '../data/history-repository';
import { buildHistorySessions } from '../domain/history';
import { buildHoursTrend, buildVolumeTrend } from '../domain/trends';
import type { HistorySession, TrendPoint } from '../types';

export interface UseHistoryAnalyticsOptions {
  trendLimit?: number;
}

export interface UseHistoryAnalyticsResult {
  sessions: HistorySession[];
  volumeTrend: TrendPoint[];
  hoursTrend: TrendPoint[];
  refresh: () => void;
}

export function useHistoryAnalytics(
  options: UseHistoryAnalyticsOptions = {},
): UseHistoryAnalyticsResult {
  const { trendLimit = 6 } = options;
  const db = useDatabase();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((currentValue: number) => currentValue + 1);
  }, []);

  useEffect(() => {
    const { sessionRows, setRows } = loadHistoryRows(db);
    setSessions(buildHistorySessions(sessionRows, setRows));
  }, [db, refreshKey]);

  const volumeTrend = useMemo(
    () => buildVolumeTrend(sessions, trendLimit),
    [sessions, trendLimit],
  );
  const hoursTrend = useMemo(
    () => buildHoursTrend(sessions, trendLimit),
    [sessions, trendLimit],
  );

  return {
    sessions,
    volumeTrend,
    hoursTrend,
    refresh,
  };
}
