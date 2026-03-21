import { useCallback, useEffect } from 'react';

import { useDatabase } from '@core/database/provider';
import type { ActiveWorkoutSession } from '../types';
import {
  completeWorkoutSessionRecord,
  createWorkoutSessionExerciseRecord,
  createWorkoutSetRecord,
  deleteWorkoutSessionRecord,
  deleteWorkoutExerciseRecords,
  deleteWorkoutSetRecord,
  getNextWorkoutSessionExercisePosition,
  loadActiveWorkoutSession,
  updateWorkoutSessionExerciseRest,
  updateWorkoutSetCompletion,
  updateWorkoutSetReps,
  updateWorkoutSetWeight,
} from '../session-repository';
import { DEFAULT_EXERCISE_TIMER_SECONDS, useWorkoutStore } from '../store';

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
  addExercise: (exerciseId: string, exerciseName: string) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  deleteSet: (setId: string) => void;
  updateExerciseRestSeconds?: (exerciseId: string, restSeconds: number) => void;
  updateReps: (setId: string, reps: number) => void;
  updateWeight: (setId: string, weight: number) => void;
  toggleSetLogged: (setId: string, isCompleted: boolean) => void;
  completeWorkout: () => string | null;
  deleteWorkout: () => boolean;
} {
  const db = useDatabase();
  const {
    activeSession,
    activeSessionId,
    startWorkout,
    addExercise: addExerciseToStore,
    removeExercise: removeExerciseFromStore,
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

  const addExercise = useCallback(
    (exerciseId: string, exerciseName: string): void => {
      const currentState = useWorkoutStore.getState();
      const currentActiveSession = currentState.activeSession;
      const currentActiveSessionId = currentState.activeSessionId;

      if (
        !currentActiveSessionId ||
        !currentActiveSession ||
        currentActiveSession.exercises.some(
          (item) => item.exerciseId === exerciseId,
        )
      ) {
        return;
      }

      const nextExercisePosition = Math.max(
        currentActiveSession.exercises.length,
        getNextWorkoutSessionExercisePosition(db, currentActiveSessionId),
      );
      let newSet: ReturnType<typeof createWorkoutSetRecord> | null = null;

      db.withTransactionSync(() => {
        newSet = createWorkoutSetRecord(
          db,
          currentActiveSessionId,
          exerciseId,
          0,
          0,
          null,
          null,
        );
        createWorkoutSessionExerciseRecord(
          db,
          currentActiveSessionId,
          exerciseId,
          nextExercisePosition,
          DEFAULT_EXERCISE_TIMER_SECONDS,
        );
      });

      if (!newSet) {
        return;
      }

      addExerciseToStore({
        exerciseId,
        exerciseName,
        restSeconds: DEFAULT_EXERCISE_TIMER_SECONDS,
        targetSets: null,
        targetReps: null,
        sets: [newSet],
      });
    },
    [addExerciseToStore, db],
  );

  const removeExercise = useCallback(
    (exerciseId: string): void => {
      const currentState = useWorkoutStore.getState();
      const currentActiveSession = currentState.activeSession;
      const currentActiveSessionId = currentState.activeSessionId;

      if (!currentActiveSessionId || !currentActiveSession) {
        return;
      }

      deleteWorkoutExerciseRecords(db, currentActiveSessionId, exerciseId);
      removeExerciseFromStore(exerciseId);
    },
    [db, removeExerciseFromStore],
  );

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

  const updateExerciseRestSeconds = useCallback(
    (exerciseId: string, restSeconds: number): void => {
      if (!activeSessionId) {
        return;
      }

      updateWorkoutSessionExerciseRest(
        db,
        activeSessionId,
        exerciseId,
        restSeconds,
      );
    },
    [activeSessionId, db],
  );

  const toggleSetLogged = useCallback(
    (setId: string, isCompleted: boolean): void => {
      updateWorkoutSetCompletion(db, setId, isCompleted);
      updateSet(setId, { isCompleted });
    },
    [db, updateSet],
  );

  const completeWorkout = useCallback((): string | null => {
    if (!activeSessionId) {
      return null;
    }

    completeWorkoutSessionRecord(db, activeSessionId, Date.now());
    const completedSessionId = activeSessionId;
    endWorkout();
    return completedSessionId;
  }, [activeSessionId, db, endWorkout]);

  const deleteWorkout = useCallback((): boolean => {
    if (!activeSessionId) {
      return false;
    }

    deleteWorkoutSessionRecord(db, activeSessionId);
    endWorkout();
    return true;
  }, [activeSessionId, db, endWorkout]);

  return {
    activeSession,
    addExercise,
    removeExercise,
    addSet,
    deleteSet,
    updateExerciseRestSeconds,
    updateReps,
    updateWeight,
    toggleSetLogged,
    completeWorkout,
    deleteWorkout,
  };
}
