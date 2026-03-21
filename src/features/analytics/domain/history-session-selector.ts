import type { HistorySession } from '../types';

export function findHistorySessionById(
  sessions: HistorySession[],
  sessionId: string,
): HistorySession | null {
  return (
    sessions.find((session: HistorySession) => session.id === sessionId) ?? null
  );
}
