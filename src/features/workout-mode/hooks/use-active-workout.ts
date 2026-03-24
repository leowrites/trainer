/**
 * Active workout write hooks.
 *
 * CALLING SPEC:
 * - `useEnsureActiveWorkoutLoaded()` restores the in-memory workout snapshot when needed
 * - `useActiveWorkoutActions()` returns optimistic active-workout mutations plus a queued flush API
 * - button interactions update Zustand immediately and defer SQLite writes off the press path
 * - side effects: sqlite reads and writes, app-state flush handling
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@core/database/provider';
import type { ActiveWorkoutSet } from '../types';
import {
  completeWorkoutSessionRecord,
  createWorkoutSessionExerciseRecord,
  createWorkoutSetRecord,
  deleteWorkoutExerciseRecords,
  deleteWorkoutSessionRecord,
  deleteWorkoutSetRecord,
  getNextWorkoutSessionExercisePosition,
  loadActiveWorkoutSession,
  updateWorkoutSessionExerciseRest,
  updateWorkoutSetFields,
} from '../session-repository';
import { DEFAULT_EXERCISE_TIMER_SECONDS, useWorkoutStore } from '../store';

const PERSISTENCE_FLUSH_DELAY_MS = 180;

type QueuedSetChanges = Partial<
  Pick<ActiveWorkoutSet, 'reps' | 'weight' | 'isCompleted' | 'actualRir'>
>;

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

function normalizeOptionalRir(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.round(value * 10) / 10);
}

function mergeQueuedSetChanges(
  currentChanges: QueuedSetChanges | undefined,
  nextChanges: QueuedSetChanges,
): QueuedSetChanges {
  return {
    ...(currentChanges ?? {}),
    ...nextChanges,
  };
}

export function useEnsureActiveWorkoutLoaded(): void {
  const db = useDatabase();
  const activeSessionId = useWorkoutStore((state) => state.activeSessionId);
  const activeSessionMeta = useWorkoutStore((state) => state.activeSessionMeta);
  const startWorkout = useWorkoutStore((state) => state.startWorkout);

  useEffect(() => {
    let isCancelled = false;

    async function ensureLoaded(): Promise<void> {
      if (!activeSessionId || activeSessionMeta !== null) {
        return;
      }

      const session = await loadActiveWorkoutSession(db, activeSessionId);

      if (!isCancelled && session) {
        startWorkout(session);
      }
    }

    void ensureLoaded();

    return () => {
      isCancelled = true;
    };
  }, [activeSessionId, activeSessionMeta, db, startWorkout]);
}

export function useActiveWorkoutActions(): {
  addExercise: (exerciseId: string, exerciseName: string) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  deleteSet: (setId: string) => void;
  updateExerciseRestSeconds: (exerciseId: string, restSeconds: number) => void;
  updateReps: (setId: string, reps: number) => void;
  updateWeight: (setId: string, weight: number) => void;
  updateActualRir: (setId: string, actualRir: number | null) => void;
  toggleSetLogged: (setId: string, isCompleted: boolean) => void;
  flushPendingWrites: () => Promise<void>;
  isCriticalMutationPending: boolean;
  completeWorkout: () => Promise<string | null>;
  deleteWorkout: () => Promise<boolean>;
} {
  const db = useDatabase();
  const addExerciseToStore = useWorkoutStore((state) => state.addExercise);
  const removeExerciseFromStore = useWorkoutStore(
    (state) => state.removeExercise,
  );
  const addSetToStore = useWorkoutStore((state) => state.addSet);
  const deleteSetFromStore = useWorkoutStore((state) => state.deleteSet);
  const updateSet = useWorkoutStore((state) => state.updateSet);
  const endWorkout = useWorkoutStore((state) => state.endWorkout);
  const pendingSetChangesRef = useRef<Record<string, QueuedSetChanges>>({});
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushInFlightRef = useRef<Promise<void> | null>(null);
  const [isCriticalMutationPending, setIsCriticalMutationPending] =
    useState(false);
  const isCriticalMutationPendingRef = useRef(false);

  const flushPendingWrites = useCallback(async (): Promise<void> => {
    if (flushTimeoutRef.current !== null) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }

    const pendingSetChanges = pendingSetChangesRef.current;
    const pendingEntries = Object.entries(pendingSetChanges);

    if (pendingEntries.length === 0) {
      if (flushInFlightRef.current) {
        await flushInFlightRef.current;
      }
      return;
    }

    pendingSetChangesRef.current = {};

    const flushPromise = db.withTransactionAsync(async () => {
      for (const [setId, changes] of pendingEntries) {
        await updateWorkoutSetFields(db, setId, changes);
      }
    });
    flushInFlightRef.current = flushPromise;

    try {
      await flushPromise;
    } finally {
      if (flushInFlightRef.current === flushPromise) {
        flushInFlightRef.current = null;
      }
    }
  }, [db]);

  const schedulePendingFlush = useCallback((): void => {
    if (flushTimeoutRef.current !== null) {
      clearTimeout(flushTimeoutRef.current);
    }

    flushTimeoutRef.current = setTimeout(() => {
      flushTimeoutRef.current = null;
      void flushPendingWrites();
    }, PERSISTENCE_FLUSH_DELAY_MS);
  }, [flushPendingWrites]);

  const queueSetChanges = useCallback(
    (setId: string, changes: QueuedSetChanges): void => {
      pendingSetChangesRef.current = {
        ...pendingSetChangesRef.current,
        [setId]: mergeQueuedSetChanges(
          pendingSetChangesRef.current[setId],
          changes,
        ),
      };
      schedulePendingFlush();
    },
    [schedulePendingFlush],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active') {
        void flushPendingWrites();
      }
    });

    return () => {
      subscription.remove();

      if (flushTimeoutRef.current !== null) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }

      void flushPendingWrites();
    };
  }, [flushPendingWrites]);

  const addExercise = useCallback(
    (exerciseId: string, exerciseName: string): void => {
      void (async () => {
        await flushPendingWrites();

        const currentState = useWorkoutStore.getState();
        const currentActiveSessionId = currentState.activeSessionId;

        if (
          !currentActiveSessionId ||
          currentState.activeExercisesById[exerciseId]
        ) {
          return;
        }

        const nextExercisePosition = Math.max(
          currentState.activeExerciseOrder.length,
          await getNextWorkoutSessionExercisePosition(
            db,
            currentActiveSessionId,
          ),
        );
        let newSet: Awaited<ReturnType<typeof createWorkoutSetRecord>> | null =
          null;

        await db.withTransactionAsync(async () => {
          newSet = await createWorkoutSetRecord(
            db,
            currentActiveSessionId,
            exerciseId,
            0,
            0,
            null,
            null,
            null,
            'optional',
          );
          await createWorkoutSessionExerciseRecord(
            db,
            currentActiveSessionId,
            exerciseId,
            nextExercisePosition,
            DEFAULT_EXERCISE_TIMER_SECONDS,
            'double_progression',
            null,
          );
        });

        if (!newSet) {
          return;
        }

        addExerciseToStore({
          exerciseId,
          exerciseName,
          restSeconds: DEFAULT_EXERCISE_TIMER_SECONDS,
          progressionPolicy: 'double_progression',
          targetRir: null,
          targetSets: null,
          targetReps: null,
          targetRepsMin: null,
          targetRepsMax: null,
          sets: [newSet],
        });
      })().catch((error: unknown) => {
        console.error('[Workout] Failed to add exercise:', error);
      });
    },
    [addExerciseToStore, db, flushPendingWrites],
  );

  const removeExercise = useCallback(
    (exerciseId: string): void => {
      void (async () => {
        await flushPendingWrites();

        const currentState = useWorkoutStore.getState();
        const currentActiveSessionId = currentState.activeSessionId;

        if (!currentActiveSessionId) {
          return;
        }

        await deleteWorkoutExerciseRecords(
          db,
          currentActiveSessionId,
          exerciseId,
        );
        removeExerciseFromStore(exerciseId);
      })().catch((error: unknown) => {
        console.error('[Workout] Failed to remove exercise:', error);
      });
    },
    [db, flushPendingWrites, removeExerciseFromStore],
  );

  const updateReps = useCallback(
    (setId: string, reps: number): void => {
      const normalizedReps = normalizeInteger(reps);
      const currentSet = useWorkoutStore.getState().activeSetsById[setId];

      if (!currentSet) {
        return;
      }

      if (currentSet.reps === normalizedReps) {
        return;
      }

      updateSet(setId, { reps: normalizedReps });
      queueSetChanges(setId, { reps: normalizedReps });
    },
    [queueSetChanges, updateSet],
  );

  const updateWeight = useCallback(
    (setId: string, weight: number): void => {
      const normalizedWeight = normalizeWeight(weight);
      const currentSet = useWorkoutStore.getState().activeSetsById[setId];

      if (!currentSet) {
        return;
      }

      if (currentSet.weight === normalizedWeight) {
        return;
      }

      updateSet(setId, { weight: normalizedWeight });
      queueSetChanges(setId, { weight: normalizedWeight });
    },
    [queueSetChanges, updateSet],
  );

  const addSet = useCallback(
    (exerciseId: string): void => {
      void (async () => {
        await flushPendingWrites();

        const currentState = useWorkoutStore.getState();
        const currentActiveSessionId = currentState.activeSessionId;
        const currentExercise = currentState.activeExercisesById[exerciseId];

        if (!currentActiveSessionId || !currentExercise) {
          return;
        }

        const previousSetId = currentExercise.setIds.at(-1);
        const previousSet =
          previousSetId === undefined
            ? null
            : (currentState.activeSetsById[previousSetId] ?? null);
        const newSet = await createWorkoutSetRecord(
          db,
          currentActiveSessionId,
          exerciseId,
          previousSet?.reps ?? 0,
          previousSet?.weight ?? 0,
          currentExercise.targetSets ?? previousSet?.targetSets ?? null,
          currentExercise.targetRepsMin ??
            currentExercise.targetReps ??
            previousSet?.targetRepsMin ??
            previousSet?.targetReps ??
            null,
          currentExercise.targetRepsMax ??
            currentExercise.targetRepsMin ??
            currentExercise.targetReps ??
            previousSet?.targetRepsMax ??
            previousSet?.targetRepsMin ??
            previousSet?.targetReps ??
            null,
          'optional',
        );

        addSetToStore(exerciseId, newSet);
      })().catch((error: unknown) => {
        console.error('[Workout] Failed to add set:', error);
      });
    },
    [addSetToStore, db, flushPendingWrites],
  );

  const deleteSet = useCallback(
    (setId: string): void => {
      void (async () => {
        await flushPendingWrites();
        await deleteWorkoutSetRecord(db, setId);
        deleteSetFromStore(setId);
      })().catch((error: unknown) => {
        console.error('[Workout] Failed to delete set:', error);
      });
    },
    [db, deleteSetFromStore, flushPendingWrites],
  );

  const updateExerciseRestSeconds = useCallback(
    (exerciseId: string, restSeconds: number): void => {
      void (async () => {
        const currentActiveSessionId =
          useWorkoutStore.getState().activeSessionId;

        if (!currentActiveSessionId) {
          return;
        }

        await updateWorkoutSessionExerciseRest(
          db,
          currentActiveSessionId,
          exerciseId,
          restSeconds,
        );
      })().catch((error: unknown) => {
        console.error('[Workout] Failed to update exercise rest timer:', error);
      });
    },
    [db],
  );

  const toggleSetLogged = useCallback(
    (setId: string, isCompleted: boolean): void => {
      const currentSet = useWorkoutStore.getState().activeSetsById[setId];

      if (!currentSet || currentSet.isCompleted === isCompleted) {
        return;
      }

      updateSet(setId, { isCompleted });
      queueSetChanges(setId, { isCompleted });
    },
    [queueSetChanges, updateSet],
  );

  const updateActualRir = useCallback(
    (setId: string, actualRir: number | null): void => {
      const normalizedActualRir = normalizeOptionalRir(actualRir);
      const currentSet = useWorkoutStore.getState().activeSetsById[setId];

      if (!currentSet || currentSet.actualRir === normalizedActualRir) {
        return;
      }

      updateSet(setId, { actualRir: normalizedActualRir });
      queueSetChanges(setId, { actualRir: normalizedActualRir });
    },
    [queueSetChanges, updateSet],
  );

  const completeWorkout = useCallback(async (): Promise<string | null> => {
    if (isCriticalMutationPendingRef.current) {
      return null;
    }

    const activeSessionId = useWorkoutStore.getState().activeSessionId;

    if (!activeSessionId) {
      return null;
    }

    isCriticalMutationPendingRef.current = true;
    setIsCriticalMutationPending(true);

    try {
      await flushPendingWrites();
      await completeWorkoutSessionRecord(db, activeSessionId, Date.now());
      endWorkout();
      return activeSessionId;
    } finally {
      isCriticalMutationPendingRef.current = false;
      setIsCriticalMutationPending(false);
    }
  }, [db, endWorkout, flushPendingWrites]);

  const deleteWorkout = useCallback(async (): Promise<boolean> => {
    if (isCriticalMutationPendingRef.current) {
      return false;
    }

    const activeSessionId = useWorkoutStore.getState().activeSessionId;

    if (!activeSessionId) {
      return false;
    }

    isCriticalMutationPendingRef.current = true;
    setIsCriticalMutationPending(true);

    try {
      await flushPendingWrites();
      await deleteWorkoutSessionRecord(db, activeSessionId);
      endWorkout();
      return true;
    } finally {
      isCriticalMutationPendingRef.current = false;
      setIsCriticalMutationPending(false);
    }
  }, [db, endWorkout, flushPendingWrites]);

  return useMemo(
    () => ({
      addExercise,
      removeExercise,
      addSet,
      deleteSet,
      updateExerciseRestSeconds,
      updateReps,
      updateWeight,
      updateActualRir,
      toggleSetLogged,
      flushPendingWrites,
      isCriticalMutationPending,
      completeWorkout,
      deleteWorkout,
    }),
    [
      addExercise,
      removeExercise,
      addSet,
      deleteSet,
      updateExerciseRestSeconds,
      updateReps,
      updateWeight,
      updateActualRir,
      toggleSetLogged,
      flushPendingWrites,
      isCriticalMutationPending,
      completeWorkout,
      deleteWorkout,
    ],
  );
}

export const useActiveWorkout = useActiveWorkoutActions;
