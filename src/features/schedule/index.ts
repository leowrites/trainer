/**
 * Schedule feature slice
 *
 * Manages rotating workout schedules (e.g., Push A → Pull A → Push B → Pull B).
 * Determines which routine is "next" based on the user's history and schedule config.
 */
export { ScheduleScreen } from './screens/schedule-screen';
export { useSchedules } from './hooks/use-schedules';
export {
  getNextPosition,
  selectNextRoutineId,
} from './domain/schedule-rotation';
export type { ScheduleEntryData } from './domain/schedule-rotation';
