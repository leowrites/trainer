import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  startWorkoutThunk,
  endWorkoutThunk,
  logSetThunk,
  updateSetThunk,
  incrementTimer,
  startRestTimer,
  decrementRestTimer,
  stopRestTimer,
  clearActiveWorkout,
  addSetToActive,
} from '../store/workoutSlice';
import { ActiveSet, WorkoutSet } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { deleteSet } from '../database/workouts';

export function useWorkout() {
  const dispatch = useDispatch<AppDispatch>();
  const activeWorkout = useSelector((s: RootState) => s.workout.activeWorkout);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Workout elapsed timer
  useEffect(() => {
    if (activeWorkout && !activeWorkout.workout.endedAt) {
      timerRef.current = setInterval(() => {
        dispatch(incrementTimer());
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeWorkout, activeWorkout?.workout.endedAt]);

  // Rest timer
  useEffect(() => {
    if (activeWorkout?.isRestTimerRunning) {
      restTimerRef.current = setInterval(() => {
        dispatch(decrementRestTimer());
      }, 1000);
    } else {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [activeWorkout?.isRestTimerRunning]);

  const startWorkout = useCallback(
    (name: string, routineId?: string, scheduleId?: string) => {
      return dispatch(startWorkoutThunk({ name, routineId, scheduleId }));
    },
    [dispatch]
  );

  const finishWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    await dispatch(
      endWorkoutThunk({
        workoutId: activeWorkout.workout.id,
        durationSeconds: activeWorkout.timerSeconds,
      })
    );
    dispatch(clearActiveWorkout());
  }, [dispatch, activeWorkout]);

  const addSet = useCallback(
    async (exerciseId: string, defaultWeight?: number, defaultReps?: number) => {
      if (!activeWorkout) return;
      const existingSets = activeWorkout.sets.filter(
        (s) => s.exerciseId === exerciseId && !s.isWarmup
      );
      const setData: Omit<WorkoutSet, 'id' | 'completedAt'> = {
        workoutId: activeWorkout.workout.id,
        exerciseId,
        setNumber: existingSets.length + 1,
        weight: defaultWeight,
        reps: defaultReps,
        weightUnit: 'kg',
        isWarmup: false,
        completed: false,
        notes: '',
      };
      await dispatch(logSetThunk(setData));
    },
    [dispatch, activeWorkout]
  );

  const completeSet = useCallback(
    async (setId: string, reps: number, weight: number, restSeconds: number) => {
      await dispatch(
        updateSetThunk({
          id: setId,
          data: { reps, weight, completed: true, completedAt: Date.now() },
        })
      );
      if (restSeconds > 0) {
        dispatch(startRestTimer(restSeconds));
      }
    },
    [dispatch]
  );

  const skipRest = useCallback(() => {
    dispatch(stopRestTimer());
  }, [dispatch]);

  const removeSet = useCallback(
    async (setId: string) => {
      await deleteSet(setId);
      // Remove from active workout by dispatching with completed=false and re-loading
      // For simplicity, we update through store
      dispatch(
        updateSetThunk({ id: setId, data: { notes: '__deleted__' } })
      );
    },
    [dispatch]
  );

  return {
    activeWorkout,
    startWorkout,
    finishWorkout,
    addSet,
    completeSet,
    skipRest,
    removeSet,
  };
}
