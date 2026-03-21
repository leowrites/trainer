import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { HISTORY_PAGE_SIZE } from '../constants';
import {
  loadHistorySessionPage,
  loadHistoryTrendRows,
} from '../data/history-repository';
import {
  buildHistorySessions,
  buildHistoryTrendSessions,
} from '../domain/history';
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
  isLoadingMore: boolean;
  hasMore: boolean;
  allSessions: HistorySession[];
  sessions: HistorySession[];
  trendSeriesByMetric: HistoryTrendSeriesByMetric;
  loadMore: () => void;
  refresh: () => void;
}

export function useHistoryAnalytics(
  options: UseHistoryAnalyticsOptions = {},
): UseHistoryAnalyticsResult {
  const { trendLimit = Number.MAX_SAFE_INTEGER, trendRange = '3m' } = options;
  const db = useDatabase();
  const injectedNow = options.now;
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [trendSessions, setTrendSessions] = useState<HistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const sessionsRef = useRef<HistorySession[]>([]);
  const hasMoreRef = useRef(false);
  const isLoadingRef = useRef(true);
  const isLoadingMoreRef = useRef(false);

  const refresh = useCallback((): void => {
    isLoadingRef.current = true;
    setIsLoading(true);
    setRefreshKey((currentValue: number) => currentValue + 1);
  }, []);

  useEffect(() => {
    const trendRows = loadHistoryTrendRows(db);
    const initialPage = loadHistorySessionPage(db, {
      limit: HISTORY_PAGE_SIZE,
      offset: 0,
    });

    setTrendSessions(buildHistoryTrendSessions(trendRows));
    const nextSessions = buildHistorySessions(
      initialPage.sessionRows,
      initialPage.setRows,
    );
    sessionsRef.current = nextSessions;
    hasMoreRef.current = initialPage.hasMore;
    isLoadingRef.current = false;
    isLoadingMoreRef.current = false;
    setSessions(nextSessions);
    setHasMore(initialPage.hasMore);
    setIsLoadingMore(false);
    setIsLoading(false);
  }, [db, refreshKey]);

  const loadMore = useCallback((): void => {
    if (
      isLoadingRef.current ||
      isLoadingMoreRef.current ||
      !hasMoreRef.current
    ) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    const nextPage = loadHistorySessionPage(db, {
      limit: HISTORY_PAGE_SIZE,
      offset: sessionsRef.current.length,
    });
    const nextSessions = [
      ...sessionsRef.current,
      ...buildHistorySessions(nextPage.sessionRows, nextPage.setRows),
    ];
    sessionsRef.current = nextSessions;
    hasMoreRef.current = nextPage.hasMore;
    isLoadingMoreRef.current = false;
    setSessions(nextSessions);
    setHasMore(nextPage.hasMore);
    setIsLoadingMore(false);
  }, [db]);

  const now = injectedNow ?? Date.now();
  const filteredTrendSessions = useMemo(
    () => filterSessionsByTrendRange(trendSessions, trendRange, now),
    [now, trendSessions, trendRange],
  );

  const trendSeriesByMetric = useMemo(
    () =>
      buildTrendSeriesByMetric(filteredTrendSessions, trendRange, trendLimit),
    [filteredTrendSessions, trendLimit, trendRange],
  );

  return {
    isLoading,
    isLoadingMore,
    hasMore,
    allSessions: trendSessions,
    sessions,
    trendSeriesByMetric,
    loadMore,
    refresh,
  };
}
