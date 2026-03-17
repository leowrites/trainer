import { useCallback, useEffect } from 'react';

import { useDatabase } from '@core/database/provider';
import type { ActiveWorkoutSession } from '../types';
import {
  completeWorkoutSessionRecord,
  createWorkoutSetRecord,
  deleteWorkoutSetRecord,
  loadActiveWorkoutSession,
  updateWorkoutSetReps,
  updateWorkoutSetWeight,
} from '../session-repository';
import { useWorkoutStore } from '../store';

function normalizeInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function normalizeWeight(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

export function useActiveWorkout(): {
  activeSession: ActiveWorkoutSession | null;
  addSet: (exerciseId: string) => void;
  deleteSet: (setId: string) => void;
  updateReps: (setId: string, reps: number) => void;
  updateWeight: (setId: string, weight: number) => void;
  completeWorkout: () => boolean;
} {
  const db = useDatabase();
  const {
    activeSession,
    activeSessionId,
    startWorkout,
    addSet: addSetToStore,
    deleteSet: deleteSetFromStore,
    updateSet,
    endWorkout,
  } = useWorkoutStore();

  useEffect(() => {
    if (!activeSessionId || activeSession) {
      return;
    }

    const session = loadActiveWorkoutSession(db, activeSessionId);
    if (session) {
      startWorkout(session);
    }
  }, [activeSession, activeSessionId, db, startWorkout]);

  const updateReps = useCallback(
    (setId: string, reps: number): void => {
      const normalizedReps = normalizeInteger(reps);
      updateWorkoutSetReps(db, setId, normalizedReps);
      updateSet(setId, { reps: normalizedReps, isCompleted: true });
    },
    [db, updateSet],
  );

  const updateWeight = useCallback(
    (setId: string, weight: number): void => {
      const normalizedWeight = normalizeWeight(weight);
      updateWorkoutSetWeight(db, setId, normalizedWeight);
      updateSet(setId, { weight: normalizedWeight, isCompleted: true });
    },
    [db, updateSet],
  );

  const addSet = useCallback(
    (exerciseId: string): void => {
      if (!activeSessionId) {
        return;
      }

      const exercise = activeSession?.exercises.find(
        (item) => item.exerciseId === exerciseId,
      );
      const previousSet = exercise?.sets.at(-1);
      const newSet = createWorkoutSetRecord(
        db,
        activeSessionId,
        exerciseId,
        previousSet?.reps ?? 0,
        previousSet?.weight ?? 0,
        exercise?.targetSets ?? previousSet?.targetSets ?? null,
        exercise?.targetReps ?? previousSet?.targetReps ?? null,
      );

      addSetToStore(exerciseId, newSet);
    },
    [activeSession, activeSessionId, addSetToStore, db],
  );

  const deleteSet = useCallback(
    (setId: string): void => {
      deleteWorkoutSetRecord(db, setId);
      deleteSetFromStore(setId);
    },
    [db, deleteSetFromStore],
  );

  const completeWorkout = useCallback((): boolean => {
    if (!activeSessionId) {
      return false;
    }

    completeWorkoutSessionRecord(db, activeSessionId, Date.now());
    endWorkout();
    return true;
  }, [activeSessionId, db, endWorkout]);

  return {
    activeSession,
    addSet,
    deleteSet,
    updateReps,
    updateWeight,
    completeWorkout,
  };
}
