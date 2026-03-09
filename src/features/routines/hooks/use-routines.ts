import { Q } from '@nozbe/watermelondb';
import { useCallback, useEffect, useState } from 'react';

import { useDatabase } from '@core/database/provider';
import type { Routine } from '@core/database/models/routine';
import type { RoutineExercise } from '@core/database/models/routine-exercise';

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
 * Reactive CRUD hook for routines.
 *
 * Returns a live-updating list of routines and helpers for creating,
 * reading exercises of a routine, and deleting routines.
 */
export function useRoutines(): {
  routines: Routine[];
  getRoutineExercises: (routineId: string) => Promise<RoutineExercise[]>;
  createRoutine: (input: NewRoutineInput) => Promise<Routine>;
  deleteRoutine: (id: string) => Promise<void>;
} {
  const db = useDatabase();
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    const subscription = db.collections
      .get<Routine>('routines')
      .query()
      .observe()
      .subscribe(setRoutines);
    return () => subscription.unsubscribe();
  }, [db]);

  const getRoutineExercises = useCallback(
    async (routineId: string): Promise<RoutineExercise[]> => {
      return db.collections
        .get<RoutineExercise>('routine_exercises')
        .query(Q.where('routine_id', routineId), Q.sortBy('position', Q.asc))
        .fetch();
    },
    [db],
  );

  const createRoutine = useCallback(
    async (input: NewRoutineInput): Promise<Routine> => {
      return db.write(async () => {
        const routine = await db.collections
          .get<Routine>('routines')
          .create((record) => {
            record.name = input.name;
            record.notes = null;
          });

        for (let i = 0; i < input.exercises.length; i++) {
          const entry = input.exercises[i];
          await db.collections
            .get<RoutineExercise>('routine_exercises')
            .create((record) => {
              record.routineId = routine.id;
              record.exerciseId = entry.exerciseId;
              record.position = i;
              record.targetSets = entry.targetSets;
              record.targetReps = entry.targetReps;
            });
        }

        return routine;
      });
    },
    [db],
  );

  const deleteRoutine = useCallback(
    async (id: string): Promise<void> => {
      await db.write(async () => {
        const routine = await db.collections.get<Routine>('routines').find(id);
        // Cascade-delete associated routine exercises.
        const routineExercises = await db.collections
          .get<RoutineExercise>('routine_exercises')
          .query(Q.where('routine_id', id))
          .fetch();
        await Promise.all(routineExercises.map((r) => r.destroyPermanently()));
        await routine.destroyPermanently();
      });
    },
    [db],
  );

  return { routines, getRoutineExercises, createRoutine, deleteRoutine };
}
