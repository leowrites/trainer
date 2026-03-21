/**
 * Workout summary repository.
 *
 * CALLING SPEC:
 * - `loadWorkoutSummaryMeta(db, sessionId)` loads persisted feedback values and
 *   schedule context for a completed session.
 * - `saveWorkoutFeedbackLevel(db, sessionId, column, value)` stores one 1-5
 *   recovery score on the finished session.
 * - SQL stays inside this module and never leaks into React components.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Schedule,
  ScheduleEntry,
  WorkoutSession,
} from '@core/database/types';
import type {
  WorkoutFeedbackMetric,
  WorkoutSummaryScheduleContext,
} from './summary-types';

interface WorkoutSummarySessionRow extends Pick<
  WorkoutSession,
  'id' | 'schedule_id' | 'snapshot_name' | 'effort_level' | 'fatigue_level'
> {}

interface ScheduleRow extends Pick<
  Schedule,
  'id' | 'name' | 'current_position'
> {}

interface ScheduleEntryRow extends Pick<
  ScheduleEntry,
  'id' | 'schedule_id' | 'routine_id' | 'position'
> {
  routine_name: string | null;
}

export interface WorkoutSummaryMeta {
  effortLevel: number | null;
  fatigueLevel: number | null;
  scheduleContext: WorkoutSummaryScheduleContext | null;
}

function clampFeedbackLevel(value: number): number {
  if (!Number.isFinite(value)) {
    return 3;
  }

  return Math.min(5, Math.max(1, Math.round(value)));
}

function getNextRoutineName(
  entries: ScheduleEntryRow[],
  currentPosition: number,
): string | null {
  if (entries.length === 0) {
    return null;
  }

  const nextIndex = (currentPosition + 1) % entries.length;
  return entries[nextIndex]?.routine_name ?? null;
}

function buildScheduleContext(
  schedule: ScheduleRow,
  entries: ScheduleEntryRow[],
  fallbackRoutineName: string,
): WorkoutSummaryScheduleContext {
  const completedEntry =
    entries.find((entry) => entry.position === schedule.current_position) ??
    null;

  return {
    scheduleName: schedule.name,
    completedRoutineName: completedEntry?.routine_name ?? fallbackRoutineName,
    completedPositionLabel: `${schedule.current_position + 1} of ${entries.length}`,
    nextRoutineName: getNextRoutineName(entries, schedule.current_position),
  };
}

export function loadWorkoutSummaryMeta(
  db: SQLiteDatabase,
  sessionId: string,
): WorkoutSummaryMeta {
  const sessionRow = db.getFirstSync<WorkoutSummarySessionRow>(
    `SELECT id, schedule_id, snapshot_name, effort_level, fatigue_level
     FROM workout_sessions
     WHERE id = ?
     LIMIT 1`,
    [sessionId],
  );

  if (!sessionRow) {
    return {
      effortLevel: null,
      fatigueLevel: null,
      scheduleContext: null,
    };
  }

  if (!sessionRow.schedule_id) {
    return {
      effortLevel: sessionRow.effort_level,
      fatigueLevel: sessionRow.fatigue_level,
      scheduleContext: null,
    };
  }

  const schedule = db.getFirstSync<ScheduleRow>(
    `SELECT id, name, current_position
     FROM schedules
     WHERE id = ?
     LIMIT 1`,
    [sessionRow.schedule_id],
  );

  if (!schedule) {
    return {
      effortLevel: sessionRow.effort_level,
      fatigueLevel: sessionRow.fatigue_level,
      scheduleContext: null,
    };
  }

  const entries = db.getAllSync<ScheduleEntryRow>(
    `SELECT se.id, se.schedule_id, se.routine_id, se.position, r.name AS routine_name
     FROM schedule_entries se
     LEFT JOIN routines r ON r.id = se.routine_id
     WHERE se.schedule_id = ?
     ORDER BY se.position ASC`,
    [sessionRow.schedule_id],
  );

  return {
    effortLevel: sessionRow.effort_level,
    fatigueLevel: sessionRow.fatigue_level,
    scheduleContext:
      entries.length === 0
        ? null
        : buildScheduleContext(
            schedule,
            entries,
            sessionRow.snapshot_name ?? 'Workout',
          ),
  };
}

export function saveWorkoutFeedbackLevel(
  db: SQLiteDatabase,
  sessionId: string,
  metric: WorkoutFeedbackMetric,
  value: number,
): void {
  const column = metric === 'effort' ? 'effort_level' : 'fatigue_level';

  db.runSync(`UPDATE workout_sessions SET ${column} = ? WHERE id = ?`, [
    clampFeedbackLevel(value),
    sessionId,
  ]);
}
