import type { DashboardMetrics, HistorySession } from '../types';

export interface DashboardMetricsOptions {
  now?: number;
  weekStartsOn?: number;
}

function startOfLocalDay(timestamp: number): Date {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getStartOfLocalWeek(timestamp: number, weekStartsOn: number): Date {
  const date = startOfLocalDay(timestamp);
  const currentDay = date.getDay();
  const normalizedWeekStart = ((weekStartsOn % 7) + 7) % 7;
  const dayOffset = (currentDay - normalizedWeekStart + 7) % 7;

  date.setDate(date.getDate() - dayOffset);
  return date;
}

function getLocalWeekKey(timestamp: number, weekStartsOn: number): string {
  return getStartOfLocalWeek(timestamp, weekStartsOn).toISOString();
}

function getCompletedSessions(sessions: HistorySession[]): HistorySession[] {
  return sessions.filter((session: HistorySession) => session.endTime !== null);
}

/**
 * Dashboard semantics for the future home screen.
 *
 * - "workouts this week" counts only completed sessions whose completion time
 *   falls inside the current local week.
 * - "streak" means consecutive local weeks with at least one completed
 *   workout, anchored to the current local week. If the current week has no
 *   completed workout yet, the streak is 0.
 */
export function buildDashboardMetrics(
  sessions: HistorySession[],
  options: DashboardMetricsOptions = {},
): DashboardMetrics {
  const { now = Date.now(), weekStartsOn = 0 } = options;
  const completedSessions = getCompletedSessions(sessions);

  if (completedSessions.length === 0) {
    return {
      workoutsThisWeek: 0,
      workoutDaysThisWeek: 0,
      currentWeeklyStreak: 0,
      lastCompletedWorkoutAt: null,
    };
  }

  const startOfCurrentWeek = getStartOfLocalWeek(now, weekStartsOn).getTime();
  const startOfNextWeek = new Date(startOfCurrentWeek);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  const completedThisWeek = completedSessions.filter(
    (session: HistorySession) =>
      session.endTime !== null &&
      session.endTime >= startOfCurrentWeek &&
      session.endTime < startOfNextWeek.getTime(),
  );
  const completedWeekKeys = new Set(
    completedSessions.map((session: HistorySession) =>
      getLocalWeekKey(session.endTime as number, weekStartsOn),
    ),
  );

  let currentWeeklyStreak = 0;
  let cursor = getStartOfLocalWeek(now, weekStartsOn);

  while (completedWeekKeys.has(cursor.toISOString())) {
    currentWeeklyStreak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 7);
  }

  const completedDaysThisWeek = new Set(
    completedThisWeek.map((session: HistorySession) =>
      startOfLocalDay(session.endTime as number).toISOString(),
    ),
  );
  const lastCompletedWorkoutAt = completedSessions.reduce(
    (latestTimestamp: number, session: HistorySession) =>
      Math.max(latestTimestamp, session.endTime as number),
    0,
  );

  return {
    workoutsThisWeek: completedThisWeek.length,
    workoutDaysThisWeek: completedDaysThisWeek.size,
    currentWeeklyStreak,
    lastCompletedWorkoutAt,
  };
}
