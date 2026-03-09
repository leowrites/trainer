import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ActiveWorkout, ActiveSet, Workout, WorkoutSet } from '../types';
import { createWorkout, updateWorkout, logSet, updateSet, getAllWorkouts } from '../database/workouts';
import { v4 as uuidv4 } from 'uuid';

interface WorkoutState {
  activeWorkout: ActiveWorkout | null;
  isLoading: boolean;
  recentWorkouts: Workout[];
}

const initialState: WorkoutState = {
  activeWorkout: null,
  isLoading: false,
  recentWorkouts: [],
};

export const startWorkoutThunk = createAsyncThunk(
  'workout/start',
  async (params: { name: string; routineId?: string; scheduleId?: string }) => {
    const workout = await createWorkout({ name: params.name, notes: '', routineId: params.routineId, scheduleId: params.scheduleId });
    return workout;
  }
);

export const endWorkoutThunk = createAsyncThunk(
  'workout/end',
  async (params: { workoutId: string; durationSeconds: number; notes?: string }) => {
    const endedAt = Date.now();
    await updateWorkout(params.workoutId, {
      endedAt,
      durationSeconds: params.durationSeconds,
      notes: params.notes,
    });
    return { endedAt, durationSeconds: params.durationSeconds };
  }
);

export const logSetThunk = createAsyncThunk(
  'workout/logSet',
  async (data: Omit<WorkoutSet, 'id' | 'completedAt'>) => {
    return logSet(data);
  }
);

export const updateSetThunk = createAsyncThunk(
  'workout/updateSet',
  async (params: { id: string; data: Partial<WorkoutSet> }) => {
    await updateSet(params.id, params.data);
    return params;
  }
);

export const loadRecentWorkoutsThunk = createAsyncThunk(
  'workout/loadRecent',
  async () => getAllWorkouts(20)
);

const workoutSlice = createSlice({
  name: 'workout',
  initialState,
  reducers: {
    addSetToActive(state, action: PayloadAction<ActiveSet>) {
      if (state.activeWorkout) {
        state.activeWorkout.sets.push(action.payload);
      }
    },
    updateActiveSet(state, action: PayloadAction<{ id: string; changes: Partial<ActiveSet> }>) {
      if (state.activeWorkout) {
        const idx = state.activeWorkout.sets.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) {
          state.activeWorkout.sets[idx] = { ...state.activeWorkout.sets[idx], ...action.payload.changes };
        }
      }
    },
    completeActiveSet(state, action: PayloadAction<string>) {
      if (state.activeWorkout) {
        const idx = state.activeWorkout.sets.findIndex((s) => s.id === action.payload);
        if (idx !== -1) {
          state.activeWorkout.sets[idx].completed = true;
          state.activeWorkout.sets[idx].completedAt = Date.now();
        }
      }
    },
    incrementTimer(state) {
      if (state.activeWorkout) {
        state.activeWorkout.timerSeconds += 1;
      }
    },
    startRestTimer(state, action: PayloadAction<number>) {
      if (state.activeWorkout) {
        state.activeWorkout.restTimerSeconds = action.payload;
        state.activeWorkout.isRestTimerRunning = true;
      }
    },
    decrementRestTimer(state) {
      if (state.activeWorkout && state.activeWorkout.isRestTimerRunning) {
        if (state.activeWorkout.restTimerSeconds > 0) {
          state.activeWorkout.restTimerSeconds -= 1;
        } else {
          state.activeWorkout.isRestTimerRunning = false;
        }
      }
    },
    stopRestTimer(state) {
      if (state.activeWorkout) {
        state.activeWorkout.isRestTimerRunning = false;
        state.activeWorkout.restTimerSeconds = 0;
      }
    },
    clearActiveWorkout(state) {
      state.activeWorkout = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startWorkoutThunk.pending, (state) => { state.isLoading = true; })
      .addCase(startWorkoutThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeWorkout = {
          workout: action.payload,
          sets: [],
          timerSeconds: 0,
          restTimerSeconds: 0,
          isRestTimerRunning: false,
        };
      })
      .addCase(startWorkoutThunk.rejected, (state) => { state.isLoading = false; })
      .addCase(endWorkoutThunk.fulfilled, (state, action) => {
        if (state.activeWorkout) {
          state.activeWorkout.workout.endedAt = action.payload.endedAt;
          state.activeWorkout.workout.durationSeconds = action.payload.durationSeconds;
        }
      })
      .addCase(logSetThunk.fulfilled, (state, action) => {
        if (state.activeWorkout) {
          const activeSet: ActiveSet = { ...action.payload, isActive: false };
          state.activeWorkout.sets.push(activeSet);
        }
      })
      .addCase(updateSetThunk.fulfilled, (state, action) => {
        if (state.activeWorkout) {
          const idx = state.activeWorkout.sets.findIndex((s) => s.id === action.payload.id);
          if (idx !== -1) {
            state.activeWorkout.sets[idx] = {
              ...state.activeWorkout.sets[idx],
              ...action.payload.data,
            };
          }
        }
      })
      .addCase(loadRecentWorkoutsThunk.fulfilled, (state, action) => {
        state.recentWorkouts = action.payload;
      });
  },
});

export const {
  addSetToActive,
  updateActiveSet,
  completeActiveSet,
  incrementTimer,
  startRestTimer,
  decrementRestTimer,
  stopRestTimer,
  clearActiveWorkout,
} = workoutSlice.actions;

export default workoutSlice.reducer;
