import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { Exercise } from '@core/database/types';
import { generateId } from '@core/database/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewExerciseInput {
  name: string;
  muscleGroup: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * CRUD hook for exercises using expo-sqlite.
 *
 * Returns the current list of all exercises plus helper functions
 * for creating and deleting them. Re-fetches after every mutation.
 */
export function useExercises(): {
  exercises: Exercise[];
  createExercise: (input: NewExerciseInput) => void;
  deleteExercise: (id: string) => void;
} {
  const db = useDatabase();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback((): void => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const rows = db.getAllSync<Exercise>(
      'SELECT id, name, muscle_group FROM exercises ORDER BY name ASC',
    );
    setExercises(rows);
  }, [db, refreshKey]);

  const createExercise = useCallback(
    (input: NewExerciseInput): void => {
      db.runSync(
        'INSERT INTO exercises (id, name, muscle_group) VALUES (?, ?, ?)',
        [generateId(), input.name, input.muscleGroup],
      );
      refresh();
    },
    [db, refresh],
  );

  const deleteExercise = useCallback(
    (id: string): void => {
      db.withTransactionSync(() => {
        // Cascade-delete any routine_exercise rows referencing this exercise.
        db.runSync('DELETE FROM routine_exercises WHERE exercise_id = ?', [id]);
        db.runSync('DELETE FROM exercises WHERE id = ?', [id]);
      });
      refresh();
    },
    [db, refresh],
  );

  return { exercises, createExercise, deleteExercise };
}
