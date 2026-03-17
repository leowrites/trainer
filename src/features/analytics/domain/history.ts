import type {
  HistoryExerciseSummary,
  HistorySession,
  HistorySessionRow,
  HistorySet,
  HistorySetRow,
} from '../types';

function resolveRoutineName(row: HistorySessionRow): string {
  const snapshotName = row.snapshot_name?.trim();
  const routineName = row.routine_name?.trim();

  if (snapshotName) {
    return snapshotName;
  }

  if (routineName) {
    return routineName;
  }

  return 'Free Workout';
}

function calculateDurationMinutes(
  startTime: number,
  endTime: number | null,
): number | null {
  if (endTime === null || endTime < startTime) {
    return null;
  }

  return Math.round((endTime - startTime) / 60000);
}

export function buildHistorySessions(
  sessionRows: HistorySessionRow[],
  setRows: HistorySetRow[],
): HistorySession[] {
  const setRowsBySession = new Map<string, HistorySetRow[]>();

  for (const setRow of setRows) {
    const existingRows = setRowsBySession.get(setRow.session_id) ?? [];
    existingRows.push(setRow);
    setRowsBySession.set(setRow.session_id, existingRows);
  }

  return sessionRows.map((sessionRow: HistorySessionRow) => {
    const sessionSetRows = setRowsBySession.get(sessionRow.id) ?? [];
    const exercises: HistoryExerciseSummary[] = [];
    const exerciseIndex = new Map<string, number>();

    for (const setRow of sessionSetRows) {
      let index = exerciseIndex.get(setRow.exercise_id);

      if (index === undefined) {
        index = exercises.length;
        exerciseIndex.set(setRow.exercise_id, index);
        exercises.push({
          exerciseId: setRow.exercise_id,
          exerciseName: setRow.exercise_name?.trim() || 'Exercise',
          targetSets: setRow.target_sets,
          targetReps: setRow.target_reps,
          sets: [],
          totalSets: 0,
          completedSets: 0,
          totalReps: 0,
          totalVolume: 0,
        });
      }

      const exercise = exercises[index];
      const set: HistorySet = {
        id: setRow.id,
        exerciseId: setRow.exercise_id,
        reps: setRow.reps,
        weight: setRow.weight,
        isCompleted: setRow.is_completed === 1,
      };

      exercise.sets.push(set);
      exercise.totalSets += 1;

      if (set.isCompleted) {
        exercise.completedSets += 1;
        exercise.totalReps += set.reps;
        exercise.totalVolume += set.weight * set.reps;
      }
    }

    return {
      id: sessionRow.id,
      routineId: sessionRow.routine_id,
      routineName: resolveRoutineName(sessionRow),
      startTime: sessionRow.start_time,
      endTime: sessionRow.end_time,
      durationMinutes: calculateDurationMinutes(
        sessionRow.start_time,
        sessionRow.end_time,
      ),
      totalSets: exercises.reduce(
        (sum: number, exercise: HistoryExerciseSummary) =>
          sum + exercise.totalSets,
        0,
      ),
      totalCompletedSets: exercises.reduce(
        (sum: number, exercise: HistoryExerciseSummary) =>
          sum + exercise.completedSets,
        0,
      ),
      totalVolume: exercises.reduce(
        (sum: number, exercise: HistoryExerciseSummary) =>
          sum + exercise.totalVolume,
        0,
      ),
      exerciseCount: exercises.length,
      exercises,
    };
  });
}
