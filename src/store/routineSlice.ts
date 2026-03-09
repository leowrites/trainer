import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Routine } from '../types';
import {
  getAllRoutines,
  getRoutineById,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  addExerciseToRoutine,
  updateRoutineExercise,
  removeExerciseFromRoutine,
} from '../database/routines';

interface RoutineState {
  routines: Routine[];
  selectedRoutine: Routine | null;
  isLoading: boolean;
}

const initialState: RoutineState = {
  routines: [],
  selectedRoutine: null,
  isLoading: false,
};

export const fetchRoutinesThunk = createAsyncThunk('routines/fetchAll', () => getAllRoutines());

export const fetchRoutineByIdThunk = createAsyncThunk('routines/fetchById', (id: string) =>
  getRoutineById(id)
);

export const createRoutineThunk = createAsyncThunk(
  'routines/create',
  (data: Pick<Routine, 'name' | 'description'>) => createRoutine(data)
);

export const updateRoutineThunk = createAsyncThunk(
  'routines/update',
  (params: { id: string; data: Partial<Pick<Routine, 'name' | 'description'>> }) =>
    updateRoutine(params.id, params.data)
);

export const deleteRoutineThunk = createAsyncThunk(
  'routines/delete',
  async (id: string) => { await deleteRoutine(id); return id; }
);

export const addExerciseToRoutineThunk = createAsyncThunk(
  'routines/addExercise',
  async (data: Parameters<typeof addExerciseToRoutine>[0]) => {
    await addExerciseToRoutine(data);
    return getRoutineById(data.routineId);
  }
);

export const updateRoutineExerciseThunk = createAsyncThunk(
  'routines/updateExercise',
  async (params: { id: string; routineId: string; data: Parameters<typeof updateRoutineExercise>[1] }) => {
    await updateRoutineExercise(params.id, params.data);
    return getRoutineById(params.routineId);
  }
);

export const removeExerciseFromRoutineThunk = createAsyncThunk(
  'routines/removeExercise',
  async (params: { id: string; routineId: string }) => {
    await removeExerciseFromRoutine(params.id);
    return getRoutineById(params.routineId);
  }
);

const routineSlice = createSlice({
  name: 'routines',
  initialState,
  reducers: {
    clearSelectedRoutine(state) {
      state.selectedRoutine = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoutinesThunk.pending, (state) => { state.isLoading = true; })
      .addCase(fetchRoutinesThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.routines = action.payload;
      })
      .addCase(fetchRoutinesThunk.rejected, (state) => { state.isLoading = false; })
      .addCase(fetchRoutineByIdThunk.fulfilled, (state, action) => {
        state.selectedRoutine = action.payload;
      })
      .addCase(createRoutineThunk.fulfilled, (state, action) => {
        state.routines.unshift(action.payload);
      })
      .addCase(updateRoutineThunk.fulfilled, (state, action) => {
        const idx = state.routines.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.routines[idx] = action.payload;
        if (state.selectedRoutine?.id === action.payload.id) {
          state.selectedRoutine = action.payload;
        }
      })
      .addCase(deleteRoutineThunk.fulfilled, (state, action) => {
        state.routines = state.routines.filter((r) => r.id !== action.payload);
        if (state.selectedRoutine?.id === action.payload) {
          state.selectedRoutine = null;
        }
      })
      .addCase(addExerciseToRoutineThunk.fulfilled, (state, action) => {
        const idx = state.routines.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.routines[idx] = action.payload;
        if (state.selectedRoutine?.id === action.payload.id) {
          state.selectedRoutine = action.payload;
        }
      })
      .addCase(updateRoutineExerciseThunk.fulfilled, (state, action) => {
        const idx = state.routines.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.routines[idx] = action.payload;
        if (state.selectedRoutine?.id === action.payload.id) {
          state.selectedRoutine = action.payload;
        }
      })
      .addCase(removeExerciseFromRoutineThunk.fulfilled, (state, action) => {
        const idx = state.routines.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.routines[idx] = action.payload;
        if (state.selectedRoutine?.id === action.payload.id) {
          state.selectedRoutine = action.payload;
        }
      });
  },
});

export const { clearSelectedRoutine } = routineSlice.actions;
export default routineSlice.reducer;
