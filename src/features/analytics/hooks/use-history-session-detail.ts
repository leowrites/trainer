import { useEffect, useRef, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import { loadHistorySessionById } from '../data/history-repository';
import { buildHistorySession } from '../domain/history';
import type { HistorySession } from '../types';

export interface UseHistorySessionDetailResult {
  isLoading: boolean;
  session: HistorySession | null;
}

export function useHistorySessionDetail(
  sessionId: string,
  initialSession: HistorySession | null = null,
): UseHistorySessionDetailResult {
  const db = useDatabase();
  const [session, setSession] = useState<HistorySession | null>(initialSession);
  const [isLoading, setIsLoading] = useState(true);
  const initialSessionRef = useRef<HistorySession | null>(initialSession);

  initialSessionRef.current = initialSession;

  useEffect(() => {
    const optimisticSession =
      initialSessionRef.current?.id === sessionId
        ? initialSessionRef.current
        : null;

    setSession(optimisticSession);
    setIsLoading(true);

    const result = loadHistorySessionById(db, sessionId);
    setSession(
      result ? buildHistorySession(result.sessionRow, result.setRows) : null,
    );
    setIsLoading(false);
  }, [db, sessionId]);

  return {
    isLoading,
    session,
  };
}
