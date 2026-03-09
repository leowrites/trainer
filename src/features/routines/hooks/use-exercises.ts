import { Q } from '@nozbe/watermelondb';
import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { Exercise } from '@core/database/models/exercise';
import type { RoutineExercise } from '@core/database/models/routine-exercise';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewExerciseInput {
  name: string;
  muscleGroup: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Reactive CRUD hook for exercises.
 *
 * Returns a live-updating list of all exercises plus helper functions
 * for creating, editing, and deleting them.
 */
export function useExercises(): {
  exercises: Exercise[];
  createExercise: (input: NewExerciseInput) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
} {
  const db = useDatabase();
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    const subscription = db.collections
      .get<Exercise>('exercises')
      .query()
      .observe()
      .subscribe(setExercises);
    return () => subscription.unsubscribe();
  }, [db]);

  const createExercise = useCallback(
    async (input: NewExerciseInput): Promise<void> => {
      await db.write(async () => {
        await db.collections.get<Exercise>('exercises').create((record) => {
          record.name = input.name;
          record.muscleGroup = input.muscleGroup;
        });
      });
    },
    [db],
  );

  const deleteExercise = useCallback(
    async (id: string): Promise<void> => {
      await db.write(async () => {
        const record = await db.collections.get<Exercise>('exercises').find(id);
        // Cascade-delete any routine_exercise rows referencing this exercise.
        const refs = await db.collections
          .get<RoutineExercise>('routine_exercises')
          .query(Q.where('exercise_id', id))
          .fetch();
        await Promise.all(refs.map((r) => r.destroyPermanently()));
        await record.destroyPermanently();
      });
    },
    [db],
  );

  return { exercises, createExercise, deleteExercise };
}
