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
  refresh: () => void;
  getRoutineExercises: (routineId: string) => RoutineExercise[];
  createRoutine: (input: NewRoutineInput) => Routine;
  updateRoutine: (id: string, input: NewRoutineInput) => void;
  deleteRoutine: (id: string) => void;
} {
  const db = useDatabase();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refresh = useCallback((): void => {
    setRefreshKey((k: number) => k + 1);
  }, []);

  useEffect(() => {
    const rows = db.getAllSync<Routine>(
      'SELECT id, name, notes FROM routines ORDER BY name ASC',
    );
    setRoutines(rows);
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
        // Cascade-delete orphaned schedule entries, then routine exercises and the routine.
        db.runSync('DELETE FROM schedule_entries WHERE routine_id = ?', [id]);
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
    refresh,
    getRoutineExercises,
    createRoutine,
    updateRoutine,
    deleteRoutine,
  };
}
