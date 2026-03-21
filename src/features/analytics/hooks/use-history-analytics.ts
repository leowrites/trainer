import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { loadHistoryRows } from '../data/history-repository';
import { buildHistorySessions } from '../domain/history';
import { filterSessionsByTrendRange } from '../domain/history-trend-range';
import { buildTrendSeriesByMetric } from '../domain/trends';
import type {
  HistorySession,
  HistoryTrendRange,
  HistoryTrendSeriesByMetric,
} from '../types';

export interface UseHistoryAnalyticsOptions {
  trendLimit?: number;
  trendRange?: HistoryTrendRange;
  now?: number;
}

export interface UseHistoryAnalyticsResult {
  sessions: HistorySession[];
  trendSeriesByMetric: HistoryTrendSeriesByMetric;
  refresh: () => void;
}

export function useHistoryAnalytics(
  options: UseHistoryAnalyticsOptions = {},
): UseHistoryAnalyticsResult {
  const { trendLimit = Number.MAX_SAFE_INTEGER, trendRange = '3m' } = options;
  const db = useDatabase();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now] = useState(() => options.now ?? Date.now());

  const refresh = useCallback((): void => {
    setRefreshKey((currentValue: number) => currentValue + 1);
  }, []);

  useEffect(() => {
    const { sessionRows, setRows } = loadHistoryRows(db);
    setSessions(buildHistorySessions(sessionRows, setRows));
  }, [db, refreshKey]);

  const filteredTrendSessions = useMemo(
    () => filterSessionsByTrendRange(sessions, trendRange, now),
    [now, sessions, trendRange],
  );

  const trendSeriesByMetric = useMemo(
    () =>
      buildTrendSeriesByMetric(filteredTrendSessions, trendRange, trendLimit),
    [filteredTrendSessions, trendLimit, trendRange],
  );

  return {
    sessions,
    trendSeriesByMetric,
    refresh,
  };
}
