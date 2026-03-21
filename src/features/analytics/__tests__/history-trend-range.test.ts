import { filterSessionsByTrendRange } from '../domain/history-trend-range';
import type { HistorySession } from '../types';

function buildSession(id: string, isoDate: string): HistorySession {
  const startTime = new Date(isoDate).getTime();

  return {
    id,
    routineId: 'routine-1',
    routineName: 'Routine',
    startTime,
    endTime: startTime + 45 * 60 * 1000,
    durationMinutes: 45,
    totalSets: 3,
    totalCompletedSets: 3,
    totalReps: 24,
    totalVolume: 1200,
    exerciseCount: 2,
    exercises: [],
  };
}

describe('filterSessionsByTrendRange', () => {
  const now = new Date('2026-03-20T12:00:00.000Z').getTime();
  const sessions = [
    buildSession('session-1', '2026-03-01T12:00:00.000Z'),
    buildSession('session-2', '2025-08-15T12:00:00.000Z'),
    buildSession('session-3', '2024-12-01T12:00:00.000Z'),
  ];

  it('keeps only sessions from the last 3 months', () => {
    expect(
      filterSessionsByTrendRange(sessions, '3m', now).map(
        (session) => session.id,
      ),
    ).toEqual(['session-1']);
  });

  it('keeps only sessions from the last year', () => {
    expect(
      filterSessionsByTrendRange(sessions, '1y', now).map(
        (session) => session.id,
      ),
    ).toEqual(['session-1', 'session-2']);
  });

  it('returns all sessions for all-time range', () => {
    expect(
      filterSessionsByTrendRange(sessions, 'all', now).map(
        (session) => session.id,
      ),
    ).toEqual(['session-1', 'session-2', 'session-3']);
  });

  it('includes workouts earlier on the cutoff day for rolling ranges', () => {
    const cutoffNow = new Date('2026-03-21T18:00:00.000Z').getTime();
    const cutoffDaySessions = [
      buildSession('three-month-cutoff', '2025-12-21T09:00:00.000Z'),
      buildSession('one-year-cutoff', '2025-03-21T09:00:00.000Z'),
      buildSession('outside-range', '2025-12-20T23:59:59.000Z'),
    ];

    expect(
      filterSessionsByTrendRange(cutoffDaySessions, '3m', cutoffNow).map(
        (session) => session.id,
      ),
    ).toEqual(['three-month-cutoff']);

    expect(
      filterSessionsByTrendRange(cutoffDaySessions, '1y', cutoffNow).map(
        (session) => session.id,
      ),
    ).toEqual(['three-month-cutoff', 'one-year-cutoff', 'outside-range']);
  });
});
