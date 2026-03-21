import {
  formatMonthLabel,
  formatShortDate,
  formatYearLabel,
  getLocalDateKey,
} from '../formatters';
import type {
  HistoryTrendGranularity,
  HistorySession,
  HistoryTrendMetric,
  HistoryTrendRange,
  HistoryTrendSeriesByMetric,
  TrendPoint,
} from '../types';

interface TrendBucket {
  key: string;
  label: string;
  startTime: number;
  sessionCount: number;
  hoursSessionCount: number;
  volume: number;
  hours: number;
  reps: number;
  sets: number;
}

function getMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getYearKey(timestamp: number): string {
  return String(new Date(timestamp).getFullYear());
}

function getTrendGranularity(
  trendRange: HistoryTrendRange,
): HistoryTrendGranularity {
  if (trendRange === 'all') {
    return 'year';
  }

  if (trendRange === '1y') {
    return 'month';
  }

  return 'day';
}

function buildTrendBucketIdentity(
  session: HistorySession,
  granularity: HistoryTrendGranularity,
): Pick<TrendBucket, 'key' | 'label' | 'startTime'> {
  if (granularity === 'year') {
    return {
      key: getYearKey(session.startTime),
      label: formatYearLabel(session.startTime),
      startTime: session.startTime,
    };
  }

  if (granularity === 'month') {
    return {
      key: getMonthKey(session.startTime),
      label: formatMonthLabel(session.startTime),
      startTime: session.startTime,
    };
  }

  return {
    key: getLocalDateKey(session.startTime),
    label: formatShortDate(session.startTime),
    startTime: session.startTime,
  };
}

function buildTrendBuckets(
  sessions: HistorySession[],
  granularity: HistoryTrendGranularity,
): TrendBucket[] {
  const buckets = new Map<string, TrendBucket>();

  for (const session of sessions) {
    const bucketIdentity = buildTrendBucketIdentity(session, granularity);
    const existingBucket = buckets.get(bucketIdentity.key);
    const hours =
      session.durationMinutes === null ? 0 : session.durationMinutes / 60;

    if (existingBucket) {
      existingBucket.sessionCount += 1;
      existingBucket.volume += session.totalVolume;
      existingBucket.reps += session.totalReps;
      existingBucket.sets += session.totalSets;
      if (session.durationMinutes !== null) {
        existingBucket.hours += hours;
        existingBucket.hoursSessionCount += 1;
      }
      existingBucket.startTime = Math.min(
        existingBucket.startTime,
        session.startTime,
      );
      continue;
    }

    buckets.set(bucketIdentity.key, {
      key: bucketIdentity.key,
      label: bucketIdentity.label,
      startTime: bucketIdentity.startTime,
      sessionCount: 1,
      volume: session.totalVolume,
      hours: session.durationMinutes === null ? 0 : hours,
      hoursSessionCount: session.durationMinutes === null ? 0 : 1,
      reps: session.totalReps,
      sets: session.totalSets,
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

function buildTrendPoints(
  buckets: TrendBucket[],
  metric: HistoryTrendMetric,
): TrendPoint[] {
  if (metric === 'hours') {
    return buckets
      .filter((bucket: TrendBucket) => bucket.hoursSessionCount > 0)
      .map(
        (bucket: TrendBucket): TrendPoint => ({
          key: bucket.key,
          label: bucket.label,
          value: bucket.hours,
          sessionCount: bucket.hoursSessionCount,
          startTime: bucket.startTime,
        }),
      );
  }

  return buckets.map(
    (bucket: TrendBucket): TrendPoint => ({
      key: bucket.key,
      label: bucket.label,
      value: bucket[metric],
      sessionCount: bucket.sessionCount,
      startTime: bucket.startTime,
    }),
  );
}

export function buildTrendSeriesByMetric(
  sessions: HistorySession[],
  trendRange: HistoryTrendRange,
  limit = 6,
): HistoryTrendSeriesByMetric {
  const buckets = buildTrendBuckets(sessions, getTrendGranularity(trendRange));

  return {
    volume: sliceRecentPoints(buildTrendPoints(buckets, 'volume'), limit),
    hours: sliceRecentPoints(buildTrendPoints(buckets, 'hours'), limit),
    reps: sliceRecentPoints(buildTrendPoints(buckets, 'reps'), limit),
    sets: sliceRecentPoints(buildTrendPoints(buckets, 'sets'), limit),
  };
}

export function buildVolumeTrend(
  sessions: HistorySession[],
  trendRange: HistoryTrendRange,
  limit = 6,
): TrendPoint[] {
  return buildTrendSeriesByMetric(sessions, trendRange, limit).volume;
}

export function buildHoursTrend(
  sessions: HistorySession[],
  trendRange: HistoryTrendRange,
  limit = 6,
): TrendPoint[] {
  return buildTrendSeriesByMetric(sessions, trendRange, limit).hours;
}

export function buildRepsTrend(
  sessions: HistorySession[],
  trendRange: HistoryTrendRange,
  limit = 6,
): TrendPoint[] {
  return buildTrendSeriesByMetric(sessions, trendRange, limit).reps;
}

export function buildSetsTrend(
  sessions: HistorySession[],
  trendRange: HistoryTrendRange,
  limit = 6,
): TrendPoint[] {
  return buildTrendSeriesByMetric(sessions, trendRange, limit).sets;
}
