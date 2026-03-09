/**
 * Routine snapshot domain logic
 *
 * Pure, framework-agnostic function that freezes a routine's exercise list
 * into a plain-object "snapshot" at the moment a workout session is started.
 *
 * Because WorkoutSets are eagerly created from this snapshot, any subsequent
 * edits to the originating Routine (adding/removing/reordering exercises, or
 * changing target sets/reps) will NOT mutate the in-progress session.
 */

export interface RoutineExerciseData {
  exerciseId: string;
  position: number;
  targetSets: number;
  targetReps: number;
}

export interface WorkoutSnapshotInput {
  /** Routine name captured at snapshot time. */
  snapshotName: string;
  /** Exercise entries sorted ascending by position. */
  exercises: RoutineExerciseData[];
}

/**
 * Builds an immutable snapshot of a routine.
 *
 * The exercises are returned sorted by `position` (ascending) so that the
 * caller can create WorkoutSets in the correct display order.
 *
 * @param routineName  - Name of the routine at the time the workout is started.
 * @param exercises    - Current exercise entries from the routine.
 */
export function buildRoutineSnapshot(
  routineName: string,
  exercises: RoutineExerciseData[],
): WorkoutSnapshotInput {
  return {
    snapshotName: routineName,
    exercises: [...exercises].sort((a, b) => a.position - b.position),
  };
}
