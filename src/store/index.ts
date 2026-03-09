import { configureStore } from '@reduxjs/toolkit';
import workoutReducer from './workoutSlice';
import routineReducer from './routineSlice';
import scheduleReducer from './scheduleSlice';
import healthReducer from './healthSlice';

export const store = configureStore({
  reducer: {
    workout: workoutReducer,
    routines: routineReducer,
    schedules: scheduleReducer,
    health: healthReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
