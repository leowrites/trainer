import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Schedule, ScheduleDay } from '../types';
import { getDatabase } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import { getRoutineById } from '../database/routines';

interface ScheduleState {
  schedules: Schedule[];
  activeSchedule: Schedule | null;
  isLoading: boolean;
}

const initialState: ScheduleState = {
  schedules: [],
  activeSchedule: null,
  isLoading: false,
};

interface ScheduleRow {
  id: string;
  name: string;
  isActive: number;
  currentIndex: number;
  createdAt: number;
}

interface ScheduleDayRow {
  id: string;
  scheduleId: string;
  routineId: string;
  orderIndex: number;
}

async function loadScheduleWithDays(scheduleId: string): Promise<Schedule> {
  const db = getDatabase();
  const row = await db.getFirstAsync<ScheduleRow>('SELECT * FROM schedules WHERE id = ?', [scheduleId]);
  if (!row) throw new Error(`Schedule ${scheduleId} not found`);
  const dayRows = await db.getAllAsync<ScheduleDayRow>(
    'SELECT * FROM schedule_days WHERE scheduleId = ? ORDER BY orderIndex ASC',
    [scheduleId]
  );
  const days: ScheduleDay[] = await Promise.all(
    dayRows.map(async (d) => {
      const routine = await getRoutineById(d.routineId).catch(() => undefined);
      return { ...d, routine: routine || undefined };
    })
  );
  return { ...row, isActive: row.isActive === 1, days };
}

export const fetchSchedulesThunk = createAsyncThunk('schedules/fetchAll', async () => {
  const db = getDatabase();
  const rows = await db.getAllAsync<ScheduleRow>('SELECT * FROM schedules ORDER BY createdAt DESC');
  const schedules = await Promise.all(rows.map((r) => loadScheduleWithDays(r.id)));
  return schedules;
});

export const createScheduleThunk = createAsyncThunk(
  'schedules/create',
  async (name: string) => {
    const db = getDatabase();
    const id = uuidv4();
    const createdAt = Date.now();
    await db.runAsync(
      'INSERT INTO schedules (id, name, isActive, currentIndex, createdAt) VALUES (?, ?, 0, 0, ?)',
      [id, name, createdAt]
    );
    return loadScheduleWithDays(id);
  }
);

export const deleteScheduleThunk = createAsyncThunk('schedules/delete', async (id: string) => {
  const db = getDatabase();
  await db.runAsync('DELETE FROM schedules WHERE id = ?', [id]);
  return id;
});

export const setActiveScheduleThunk = createAsyncThunk(
  'schedules/setActive',
  async (id: string) => {
    const db = getDatabase();
    await db.runAsync('UPDATE schedules SET isActive = 0');
    await db.runAsync('UPDATE schedules SET isActive = 1 WHERE id = ?', [id]);
    return loadScheduleWithDays(id);
  }
);

export const addDayToScheduleThunk = createAsyncThunk(
  'schedules/addDay',
  async (params: { scheduleId: string; routineId: string; orderIndex: number }) => {
    const db = getDatabase();
    const id = uuidv4();
    await db.runAsync(
      'INSERT INTO schedule_days (id, scheduleId, routineId, orderIndex) VALUES (?, ?, ?, ?)',
      [id, params.scheduleId, params.routineId, params.orderIndex]
    );
    return loadScheduleWithDays(params.scheduleId);
  }
);

export const removeDayFromScheduleThunk = createAsyncThunk(
  'schedules/removeDay',
  async (params: { dayId: string; scheduleId: string }) => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM schedule_days WHERE id = ?', [params.dayId]);
    return loadScheduleWithDays(params.scheduleId);
  }
);

export const advanceScheduleThunk = createAsyncThunk(
  'schedules/advance',
  async (scheduleId: string) => {
    const db = getDatabase();
    const schedule = await loadScheduleWithDays(scheduleId);
    const total = schedule.days?.length || 0;
    if (total === 0) return schedule;
    const nextIndex = (schedule.currentIndex + 1) % total;
    await db.runAsync('UPDATE schedules SET currentIndex = ? WHERE id = ?', [nextIndex, scheduleId]);
    return loadScheduleWithDays(scheduleId);
  }
);

const scheduleSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedulesThunk.pending, (state) => { state.isLoading = true; })
      .addCase(fetchSchedulesThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.schedules = action.payload;
        state.activeSchedule = action.payload.find((s) => s.isActive) || null;
      })
      .addCase(fetchSchedulesThunk.rejected, (state) => { state.isLoading = false; })
      .addCase(createScheduleThunk.fulfilled, (state, action) => {
        state.schedules.unshift(action.payload);
      })
      .addCase(deleteScheduleThunk.fulfilled, (state, action) => {
        state.schedules = state.schedules.filter((s) => s.id !== action.payload);
        if (state.activeSchedule?.id === action.payload) state.activeSchedule = null;
      })
      .addCase(setActiveScheduleThunk.fulfilled, (state, action) => {
        state.schedules = state.schedules.map((s) => ({ ...s, isActive: s.id === action.payload.id }));
        state.activeSchedule = action.payload;
      })
      .addCase(addDayToScheduleThunk.fulfilled, (state, action) => {
        const idx = state.schedules.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.schedules[idx] = action.payload;
        if (state.activeSchedule?.id === action.payload.id) state.activeSchedule = action.payload;
      })
      .addCase(removeDayFromScheduleThunk.fulfilled, (state, action) => {
        const idx = state.schedules.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.schedules[idx] = action.payload;
        if (state.activeSchedule?.id === action.payload.id) state.activeSchedule = action.payload;
      })
      .addCase(advanceScheduleThunk.fulfilled, (state, action) => {
        const idx = state.schedules.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.schedules[idx] = action.payload;
        if (state.activeSchedule?.id === action.payload.id) state.activeSchedule = action.payload;
      });
  },
});

export default scheduleSlice.reducer;
