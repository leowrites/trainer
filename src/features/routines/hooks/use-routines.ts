import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { Routine, RoutineExercise } from '@core/database/types';
import { generateId } from '@core/database/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoutineExerciseInput {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
}

export interface NewRoutineInput {
  name: string;
  exercises: RoutineExerciseInput[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * CRUD hook for routines using expo-sqlite.
 *
 * Returns the current list of routines and helpers for creating,
 * updating, reading exercises of a routine, and deleting routines.
 * Re-fetches after mutations.
 */
export function useRoutines(): {
  routines: Routine[];
  hasLoaded: boolean;
  refresh: () => void;
  getRoutineExercises: (routineId: string) => RoutineExercise[];
  getRoutineExerciseCounts: () => Record<string, number>;
  createRoutine: (input: NewRoutineInput) => Routine;
  updateRoutine: (id: string, input: NewRoutineInput) => void;
  deleteRoutine: (id: string) => void;
} {
  const db = useDatabase();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refresh = useCallback((): void => {
    setRefreshKey((k: number) => k + 1);
  }, []);

  useEffect(() => {
    const rows = db.getAllSync<Routine>(
      'SELECT id, name, notes FROM routines ORDER BY name ASC',
    );
    setRoutines(rows);
    setHasLoaded(true);
  }, [db, refreshKey]);

  const getRoutineExercises = useCallback(
    (routineId: string): RoutineExercise[] => {
      return db.getAllSync<RoutineExercise>(
        'SELECT id, routine_id, exercise_id, position, target_sets, target_reps FROM routine_exercises WHERE routine_id = ? ORDER BY position ASC',
        [routineId],
      );
    },
    [db],
  );

  const getRoutineExerciseCounts = useCallback((): Record<string, number> => {
    const rows = db.getAllSync<{
      routine_id: string;
      exercise_count: number;
    }>(
      'SELECT routine_id, COUNT(*) AS exercise_count FROM routine_exercises GROUP BY routine_id',
    );

    return rows.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.routine_id] = row.exercise_count;
      return accumulator;
    }, {});
  }, [db]);

  const createRoutine = useCallback(
    (input: NewRoutineInput): Routine => {
      const id = generateId();
      db.withTransactionSync(() => {
        db.runSync('INSERT INTO routines (id, name, notes) VALUES (?, ?, ?)', [
          id,
          input.name,
          null,
        ]);
        input.exercises.forEach((entry, i) => {
          db.runSync(
            'INSERT INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps) VALUES (?, ?, ?, ?, ?, ?)',
            [
              generateId(),
              id,
              entry.exerciseId,
              i,
              entry.targetSets,
              entry.targetReps,
            ],
          );
        });
      });
      refresh();
      return { id, name: input.name, notes: null };
    },
    [db, refresh],
  );

  const deleteRoutine = useCallback(
    (id: string): void => {
      db.withTransactionSync(() => {
        const affectedSchedulesRows = db.getAllSync<{ schedule_id: string }>(
          'SELECT DISTINCT schedule_id FROM schedule_entries WHERE routine_id = ?',
          [id],
        );
        const affectedSchedules = affectedSchedulesRows.map(
          (r) => r.schedule_id,
        );

        // Calculate how many entries will be deleted before or at current_position for each schedule
        const shiftsBySchedule: Record<string, number> = {};
        for (const scheduleId of affectedSchedules) {
          const schedule = db.getFirstSync<{ current_position: number }>(
            'SELECT current_position FROM schedules WHERE id = ?',
            [scheduleId],
          );
          if (schedule) {
            const deletedBeforeCurrent =
              db.getFirstSync<{ count: number }>(
                'SELECT COUNT(*) as count FROM schedule_entries WHERE schedule_id = ? AND routine_id = ? AND position <= ?',
                [scheduleId, id, schedule.current_position],
              )?.count ?? 0;
            shiftsBySchedule[scheduleId] = deletedBeforeCurrent;
          }
        }

        db.runSync('DELETE FROM schedule_entries WHERE routine_id = ?', [id]);

        affectedSchedules.forEach((scheduleId) => {
          const remainingEntries = db.getAllSync<{ id: string }>(
            'SELECT id FROM schedule_entries WHERE schedule_id = ? ORDER BY position ASC',
            [scheduleId],
          );

          const entryCount = remainingEntries.length;
          remainingEntries.forEach((entry, i) => {
            db.runSync(
              'UPDATE schedule_entries SET position = ? WHERE id = ?',
              [i, entry.id],
            );
          });

          const schedule = db.getFirstSync<{
            id: string;
            current_position: number;
          }>('SELECT id, current_position FROM schedules WHERE id = ?', [
            scheduleId,
          ]);

          if (schedule) {
            const shift = shiftsBySchedule[scheduleId] ?? 0;
            let nextPos = schedule.current_position - shift;

            if (entryCount === 0) {
              nextPos = -1;
            } else if (nextPos >= entryCount) {
              nextPos = entryCount - 1;
            } else if (nextPos < -1) {
              nextPos = -1;
            }

            db.runSync(
              'UPDATE schedules SET current_position = ? WHERE id = ?',
              [nextPos, scheduleId],
            );
          }
        });

        // Cascade-delete associated routine exercises.
        db.runSync('DELETE FROM routine_exercises WHERE routine_id = ?', [id]);
        db.runSync('DELETE FROM routines WHERE id = ?', [id]);
      });
      refresh();
    },
    [db, refresh],
  );

  const updateRoutine = useCallback(
    (id: string, input: NewRoutineInput): void => {
      db.withTransactionSync(() => {
        db.runSync('UPDATE routines SET name = ? WHERE id = ?', [
          input.name,
          id,
        ]);
        db.runSync('DELETE FROM routine_exercises WHERE routine_id = ?', [id]);
        input.exercises.forEach((entry, i) => {
          db.runSync(
            'INSERT INTO routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps) VALUES (?, ?, ?, ?, ?, ?)',
            [
              generateId(),
              id,
              entry.exerciseId,
              i,
              entry.targetSets,
              entry.targetReps,
            ],
          );
        });
      });
      refresh();
    },
    [db, refresh],
  );

  return {
    routines,
    hasLoaded,
    refresh,
    getRoutineExercises,
    getRoutineExerciseCounts,
    createRoutine,
    updateRoutine,
    deleteRoutine,
  };
}
