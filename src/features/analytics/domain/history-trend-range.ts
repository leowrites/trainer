import type { HistorySession, HistoryTrendRange } from '../types';

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function subtractMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() - months);
  return startOfDay(date.getTime());
}

function subtractYears(timestamp: number, years: number): number {
  const date = new Date(timestamp);
  date.setFullYear(date.getFullYear() - years);
  return startOfDay(date.getTime());
}

function resolveTrendRangeStart(
  trendRange: HistoryTrendRange,
  now: number,
): number | null {
  if (trendRange === 'all') {
    return null;
  }

  if (trendRange === '1y') {
    return subtractYears(now, 1);
  }

  return subtractMonths(now, 3);
}

export function filterSessionsByTrendRange(
  sessions: HistorySession[],
  trendRange: HistoryTrendRange,
  now: number,
): HistorySession[] {
  const startTime = resolveTrendRangeStart(trendRange, now);

  if (startTime === null) {
    return sessions;
  }

  return sessions.filter(
    (session: HistorySession) => session.startTime >= startTime,
  );
}
