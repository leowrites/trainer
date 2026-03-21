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
  isLoading: boolean;
  sessions: HistorySession[];
  trendSeriesByMetric: HistoryTrendSeriesByMetric;
  refresh: () => void;
}

export function useHistoryAnalytics(
  options: UseHistoryAnalyticsOptions = {},
): UseHistoryAnalyticsResult {
  const { trendLimit = Number.MAX_SAFE_INTEGER, trendRange = '3m' } = options;
  const db = useDatabase();
  const injectedNow = options.now;
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setIsLoading(true);
    setRefreshKey((currentValue: number) => currentValue + 1);
  }, []);

  useEffect(() => {
    const { sessionRows, setRows } = loadHistoryRows(db);
    setSessions(buildHistorySessions(sessionRows, setRows));
    setIsLoading(false);
  }, [db, refreshKey]);

  const now = injectedNow ?? Date.now();
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
    isLoading,
    sessions,
    trendSeriesByMetric,
    refresh,
  };
}
