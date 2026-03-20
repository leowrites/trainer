import type { Routine, Schedule, ScheduleEntry } from '@core/database/types';
import { selectNextRoutineId } from './schedule-rotation';

export interface ScheduleSummary {
  schedule: Schedule;
  entries: ScheduleEntry[];
  routineCount: number;
  nextRoutineId: string | null;
  nextRoutineName: string | null;
}

function getRoutineName(
  routines: Routine[],
  routineId: string | null,
): string | null {
  if (routineId === null) {
    return null;
  }

  return routines.find((routine) => routine.id === routineId)?.name ?? null;
}

export function buildScheduleSummary(
  schedule: Schedule,
  entries: ScheduleEntry[],
  routines: Routine[],
): ScheduleSummary {
  const nextRoutineId = selectNextRoutineId(
    entries.map((entry) => ({
      position: entry.position,
      routineId: entry.routine_id,
    })),
    schedule.current_position,
  );

  return {
    schedule,
    entries,
    routineCount: entries.length,
    nextRoutineId,
    nextRoutineName: getRoutineName(routines, nextRoutineId),
  };
}

export function getActiveScheduleSummary(
  schedules: Schedule[],
  routines: Routine[],
  getScheduleEntries: (scheduleId: string) => ScheduleEntry[],
): ScheduleSummary | null {
  const activeSchedule =
    schedules.find((schedule) => schedule.is_active === 1) ?? null;

  if (activeSchedule === null) {
    return null;
  }

  return buildScheduleSummary(
    activeSchedule,
    getScheduleEntries(activeSchedule.id),
    routines,
  );
}

export function getScheduleStatusText(summary: ScheduleSummary): string {
  if (summary.entries.length === 0) {
    return 'No routines added yet. Add routines to build this rotation.';
  }

  if (summary.nextRoutineName === null) {
    return 'The next routine will appear here once all entries are available.';
  }

  if (summary.schedule.current_position >= 0) {
    return `Next up: ${summary.nextRoutineName}. Last completed position ${summary.schedule.current_position + 1}.`;
  }

  return `Next up: ${summary.nextRoutineName}. Ready to start from the first routine.`;
}
