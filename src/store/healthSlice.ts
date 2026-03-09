import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { HealthLog } from '../types';
import { logHealthData, getHealthLogs, getLatestHealthLog, deleteHealthLog } from '../database/health';

interface HealthState {
  logs: HealthLog[];
  latestBodyweight: HealthLog | null;
  isLoading: boolean;
}

const initialState: HealthState = {
  logs: [],
  latestBodyweight: null,
  isLoading: false,
};

export const fetchHealthLogsThunk = createAsyncThunk(
  'health/fetchLogs',
  async (params?: { type?: HealthLog['type']; startDate?: string; endDate?: string }) => {
    return getHealthLogs(params?.type, params?.startDate, params?.endDate);
  }
);

export const logHealthDataThunk = createAsyncThunk(
  'health/log',
  async (data: Omit<HealthLog, 'id' | 'loggedAt'>) => {
    return logHealthData(data);
  }
);

export const fetchLatestBodyweightThunk = createAsyncThunk(
  'health/latestBodyweight',
  async () => getLatestHealthLog('bodyweight')
);

export const deleteHealthLogThunk = createAsyncThunk(
  'health/delete',
  async (id: string) => { await deleteHealthLog(id); return id; }
);

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHealthLogsThunk.pending, (state) => { state.isLoading = true; })
      .addCase(fetchHealthLogsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.logs = action.payload;
      })
      .addCase(fetchHealthLogsThunk.rejected, (state) => { state.isLoading = false; })
      .addCase(logHealthDataThunk.fulfilled, (state, action) => {
        state.logs.unshift(action.payload);
        if (action.payload.type === 'bodyweight') {
          state.latestBodyweight = action.payload;
        }
      })
      .addCase(fetchLatestBodyweightThunk.fulfilled, (state, action) => {
        state.latestBodyweight = action.payload;
      })
      .addCase(deleteHealthLogThunk.fulfilled, (state, action) => {
        state.logs = state.logs.filter((l) => l.id !== action.payload);
      });
  },
});

export default healthSlice.reducer;
