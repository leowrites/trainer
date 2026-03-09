import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchRoutinesThunk,
  fetchRoutineByIdThunk,
  createRoutineThunk,
  updateRoutineThunk,
  deleteRoutineThunk,
  addExerciseToRoutineThunk,
  removeExerciseFromRoutineThunk,
  clearSelectedRoutine,
} from '../store/routineSlice';
import { Routine, RoutineExercise } from '../types';

export function useRoutines() {
  const dispatch = useDispatch<AppDispatch>();
  const { routines, selectedRoutine, isLoading } = useSelector((s: RootState) => s.routines);

  useEffect(() => {
    dispatch(fetchRoutinesThunk());
  }, [dispatch]);

  const loadRoutine = useCallback(
    (id: string) => dispatch(fetchRoutineByIdThunk(id)),
    [dispatch]
  );

  const createNew = useCallback(
    (name: string, description: string) => dispatch(createRoutineThunk({ name, description })),
    [dispatch]
  );

  const update = useCallback(
    (id: string, data: Partial<Pick<Routine, 'name' | 'description'>>) =>
      dispatch(updateRoutineThunk({ id, data })),
    [dispatch]
  );

  const remove = useCallback(
    (id: string) => dispatch(deleteRoutineThunk(id)),
    [dispatch]
  );

  const addExercise = useCallback(
    (data: Parameters<typeof addExerciseToRoutineThunk>[0]) =>
      dispatch(addExerciseToRoutineThunk(data)),
    [dispatch]
  );

  const removeExercise = useCallback(
    (id: string, routineId: string) =>
      dispatch(removeExerciseFromRoutineThunk({ id, routineId })),
    [dispatch]
  );

  const clearSelected = useCallback(() => dispatch(clearSelectedRoutine()), [dispatch]);

  return {
    routines,
    selectedRoutine,
    isLoading,
    loadRoutine,
    createNew,
    update,
    remove,
    addExercise,
    removeExercise,
    clearSelected,
  };
}
