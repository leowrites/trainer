/**
 * Detailed history sessions hook.
 *
 * CALLING SPEC:
 * - `useHistorySessions()` loads all workout history with exercise and set
 *   detail for consumers that need full per-exercise context.
 * - Returns `sessions` plus `isLoading`.
 * - Keeps heavy history loading outside React render paths.
 */

import { useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { loadAllHistorySessions } from '../data/history-repository';
import { buildHistorySessions } from '../domain/history';
import type { HistorySession } from '../types';

export interface UseHistorySessionsResult {
  isLoading: boolean;
  sessions: HistorySession[];
}

export function useHistorySessions(): UseHistorySessionsResult {
  const db = useDatabase();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const rows = loadAllHistorySessions(db);
    setSessions(buildHistorySessions(rows.sessionRows, rows.setRows));
    setIsLoading(false);
  }, [db]);

  return {
    isLoading,
    sessions,
  };
}
