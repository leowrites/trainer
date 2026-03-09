/**
 * Schedule rotation domain logic
 *
 * Pure, framework-agnostic functions that determine which routine should be
 * performed next in a linear rotating schedule (A → B → C → A).
 *
 * These functions have no side effects and do not touch WatermelonDB, making
 * them easy to unit-test in isolation.
 */

export interface ScheduleEntryData {
  /** 0-based display order within the schedule. */
  position: number;
  /** ID of the Routine assigned to this slot. */
  routineId: string;
}

/**
 * Returns the array index of the next routine to perform.
 *
 * `currentPosition` is the index of the *last completed* entry (-1 when no
 * workout has been done yet under this schedule).
 *
 * The rotation is strictly linear and loops back to 0 when the end is reached:
 *   -1 → 0 → 1 → … → (n-1) → 0 → …
 *
 * @returns 0 when `totalEntries` is 0 (safe no-op).
 */
export function getNextPosition(
  currentPosition: number,
  totalEntries: number,
): number {
  if (totalEntries === 0) return 0;
  return (currentPosition + 1) % totalEntries;
}

/**
 * Selects the routine ID that should be performed next.
 *
 * Entries are sorted by their `position` field before indexing so that the
 * caller does not need to pre-sort the array.
 *
 * @returns `null` when the schedule has no entries.
 */
export function selectNextRoutineId(
  entries: ScheduleEntryData[],
  currentPosition: number,
): string | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.position - b.position);
  const nextIndex = getNextPosition(currentPosition, sorted.length);
  return sorted[nextIndex]?.routineId ?? null;
}
