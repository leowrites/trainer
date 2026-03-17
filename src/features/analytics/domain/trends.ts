import { formatShortDate, getLocalDateKey } from '../formatters';
import type { HistorySession, TrendPoint } from '../types';

interface TrendBucket {
  key: string;
  label: string;
  startTime: number;
  sessionCount: number;
  volume: number;
  hours: number;
}

function buildTrendBuckets(sessions: HistorySession[]): TrendBucket[] {
  const buckets = new Map<string, TrendBucket>();

  for (const session of sessions) {
    const key = getLocalDateKey(session.startTime);
    const existingBucket = buckets.get(key);
    const hours =
      session.durationMinutes === null ? 0 : session.durationMinutes / 60;

    if (existingBucket) {
      existingBucket.sessionCount += 1;
      existingBucket.volume += session.totalVolume;
      existingBucket.hours += hours;
      existingBucket.startTime = Math.min(
        existingBucket.startTime,
        session.startTime,
      );
      continue;
    }

    buckets.set(key, {
      key,
      label: formatShortDate(session.startTime),
      startTime: session.startTime,
      sessionCount: 1,
      volume: session.totalVolume,
      hours,
    });
  }

  return [...buckets.values()].sort(
    (left: TrendBucket, right: TrendBucket) => left.startTime - right.startTime,
  );
}

function sliceRecentPoints(points: TrendPoint[], limit: number): TrendPoint[] {
  if (limit <= 0) {
    return [];
  }

  return points.slice(-limit);
}

export function buildVolumeTrend(
  sessions: HistorySession[],
  limit = 6,
): TrendPoint[] {
  const points = buildTrendBuckets(sessions).map(
    (bucket: TrendBucket): TrendPoint => ({
      key: bucket.key,
      label: bucket.label,
      value: bucket.volume,
      sessionCount: bucket.sessionCount,
      startTime: bucket.startTime,
    }),
  );

  return sliceRecentPoints(points, limit);
}

export function buildHoursTrend(
  sessions: HistorySession[],
  limit = 6,
): TrendPoint[] {
  const points = buildTrendBuckets(sessions).map(
    (bucket: TrendBucket): TrendPoint => ({
      key: bucket.key,
      label: bucket.label,
      value: bucket.hours,
      sessionCount: bucket.sessionCount,
      startTime: bucket.startTime,
    }),
  );

  return sliceRecentPoints(points, limit);
}
