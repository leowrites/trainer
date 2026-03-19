import { buildDashboardMetrics } from '../domain/dashboard-metrics';
import type { HistorySession } from '../types';

function buildSession({
  id,
  startTime,
  endTime,
}: {
  id: string;
  startTime: number;
  endTime: number | null;
}): HistorySession {
  return {
    id,
    routineId: 'routine-1',
    routineName: 'Routine',
    startTime,
    endTime,
    durationMinutes: endTime === null ? null : 45,
    totalSets: 3,
    totalCompletedSets: endTime === null ? 0 : 3,
    totalVolume: 1200,
    exerciseCount: 2,
    exercises: [],
  };
}

describe('buildDashboardMetrics', () => {
  it('counts completed workouts in the current local week and builds a weekly streak', () => {
    const now = new Date('2026-03-18T12:00:00.000Z').getTime();
    const sessions: HistorySession[] = [
      buildSession({
        id: 'session-1',
        startTime: new Date('2026-03-16T15:00:00.000Z').getTime(),
        endTime: new Date('2026-03-16T16:00:00.000Z').getTime(),
      }),
      buildSession({
        id: 'session-2',
        startTime: new Date('2026-03-17T15:00:00.000Z').getTime(),
        endTime: new Date('2026-03-17T16:00:00.000Z').getTime(),
      }),
      buildSession({
        id: 'session-3',
        startTime: new Date('2026-03-10T15:00:00.000Z').getTime(),
        endTime: new Date('2026-03-10T16:00:00.000Z').getTime(),
      }),
    ];

    expect(buildDashboardMetrics(sessions, { now })).toEqual({
      workoutsThisWeek: 2,
      workoutDaysThisWeek: 2,
      currentWeeklyStreak: 2,
      lastCompletedWorkoutAt: new Date('2026-03-17T16:00:00.000Z').getTime(),
    });
  });

  it('resets the streak when the current week has no completed workouts', () => {
    const now = new Date('2026-03-18T12:00:00.000Z').getTime();
    const sessions: HistorySession[] = [
      buildSession({
        id: 'session-1',
        startTime: new Date('2026-03-10T15:00:00.000Z').getTime(),
        endTime: new Date('2026-03-10T16:00:00.000Z').getTime(),
      }),
    ];

    expect(buildDashboardMetrics(sessions, { now })).toEqual({
      workoutsThisWeek: 0,
      workoutDaysThisWeek: 0,
      currentWeeklyStreak: 0,
      lastCompletedWorkoutAt: new Date('2026-03-10T16:00:00.000Z').getTime(),
    });
  });

  it('ignores unfinished sessions when computing home metrics', () => {
    const now = new Date('2026-03-18T12:00:00.000Z').getTime();
    const sessions: HistorySession[] = [
      buildSession({
        id: 'session-1',
        startTime: new Date('2026-03-16T15:00:00.000Z').getTime(),
        endTime: null,
      }),
    ];

    expect(buildDashboardMetrics(sessions, { now })).toEqual({
      workoutsThisWeek: 0,
      workoutDaysThisWeek: 0,
      currentWeeklyStreak: 0,
      lastCompletedWorkoutAt: null,
    });
  });
});
