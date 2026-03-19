import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { Exercise } from '@core/database/types';
import { generateId } from '@core/database/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewExerciseInput {
  name: string;
  muscleGroup: string;
  howTo?: string | null;
  equipment?: string | null;
}

function normalizeMetadata(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim() ?? '';
  return trimmedValue === '' ? null : trimmedValue;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * CRUD hook for exercises using expo-sqlite.
 *
 * Returns the current list of all exercises plus helper functions
 * for creating, updating, and deleting them. Re-fetches after every mutation.
 */
export function useExercises(): {
  exercises: Exercise[];
  refresh: () => void;
  createExercise: (input: NewExerciseInput) => void;
  updateExercise: (id: string, input: NewExerciseInput) => void;
  deleteExercise: (id: string) => void;
} {
  const db = useDatabase();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refresh = useCallback((): void => {
    setRefreshKey((k: number) => k + 1);
  }, []);

  useEffect(() => {
    const rows = db.getAllSync<Exercise>(
      'SELECT id, name, muscle_group, how_to, equipment FROM exercises ORDER BY name ASC',
    );
    setExercises(rows);
  }, [db, refreshKey]);

  const createExercise = useCallback(
    (input: NewExerciseInput): void => {
      db.runSync(
        'INSERT INTO exercises (id, name, muscle_group, how_to, equipment) VALUES (?, ?, ?, ?, ?)',
        [
          generateId(),
          input.name,
          input.muscleGroup,
          normalizeMetadata(input.howTo),
          normalizeMetadata(input.equipment),
        ],
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

  const updateExercise = useCallback(
    (id: string, input: NewExerciseInput): void => {
      db.runSync(
        'UPDATE exercises SET name = ?, muscle_group = ?, how_to = ?, equipment = ? WHERE id = ?',
        [
          input.name,
          input.muscleGroup,
          normalizeMetadata(input.howTo),
          normalizeMetadata(input.equipment),
          id,
        ],
      );
      refresh();
    },
    [db, refresh],
  );

  return { exercises, refresh, createExercise, updateExercise, deleteExercise };
}
