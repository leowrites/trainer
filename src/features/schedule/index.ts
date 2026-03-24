/**
 * Schedule feature slice
 *
 * Manages rotating workout schedules (e.g., Push A → Pull A → Push B → Pull B).
 * Determines which routine is "next" based on the user's history and schedule config.
 */
export { ScheduleListScreen } from './screens/schedule-list-screen';
export { ScheduleDetailScreen } from './screens/schedule-detail-screen';
export { useScheduleEntries } from './hooks/use-schedule-entries';
export { useScheduleEntryIndex } from './hooks/use-schedule-entry-index';
export { useSchedules } from './hooks/use-schedules';
export {
  getNextPosition,
  selectNextRoutineId,
} from './domain/schedule-rotation';
export {
  buildScheduleSummary,
  getActiveScheduleSummary,
  getScheduleStatusText,
} from './domain/schedule-preview';
export type { ScheduleEntryData } from './domain/schedule-rotation';
export type { ScheduleStackParamList } from './types';
