import { renderHook, act, cleanup } from '@testing-library/react-native';

import type {
  Routine,
  RoutineExercise,
  Schedule,
  ScheduleEntry,
} from '@core/database/types';
import {
  createMockDb,
  createDatabaseWrapper,
} from '@core/database/__tests__/test-utils';

import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'schedule-1',
    name: 'Push/Pull',
    is_active: 1,
    current_position: -1,
    ...overrides,
  };
}

function makeEntry(routineId: string, position: number): ScheduleEntry {
  return {
    id: `entry-${position}`,
    schedule_id: 'schedule-1',
    routine_id: routineId,
    position,
  };
}

function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'routine-1',
    name: 'Push A',
    notes: null,
    ...overrides,
  };
}

function makeRoutineExercise(
  overrides: Partial<RoutineExercise> = {},
): RoutineExercise {
  return {
    id: 're-1',
    routine_id: 'routine-1',
    exercise_id: 'ex-1',
    position: 0,
    target_sets: 3,
    target_reps: 10,
    ...overrides,
  };
}

/**
 * Configures getFirstSync to return [schedule, routine] for the preview
 * effect, then {count: 1} for the DatabaseProvider seed-check (which makes
 * seedDefaultExercises return early), then [schedule, routine] for the
 * startWorkoutFromSchedule transaction.
 *
 * React runs child effects before parent effects, so the hook's preview
 * effect fires before DatabaseProvider's seed effect. Adding {count:1} at
 * position 3 prevents the seed from consuming values intended for the
 * transaction.
 */
function setupScheduledWorkoutMocks(
  db: ReturnType<typeof createMockDb>,
  schedule: Schedule,
  routine: Routine,
  entries: ScheduleEntry[],
  exercises: RoutineExercise[],
): void {
  db.getFirstSync
    .mockReturnValueOnce(schedule) // preview: active schedule
    .mockReturnValueOnce(routine) // preview: routine
    .mockReturnValueOnce({ count: 1 }) // seed check (stops seeding early)
    .mockReturnValueOnce(schedule) // transaction: active schedule
    .mockReturnValueOnce(routine); // transaction: routine

  db.getAllSync
    .mockReturnValueOnce(entries) // preview: schedule entries
    .mockReturnValueOnce(entries) // transaction: schedule entries
    .mockReturnValueOnce(exercises); // transaction: routine_exercises
}

// ─── useWorkoutStarter ────────────────────────────────────────────────────────

describe('useWorkoutStarter', () => {
  beforeEach(() => {
    useWorkoutStore.setState({
      isWorkoutActive: false,
      activeSessionId: null,
      startTime: null,
    });
  });

  afterEach(() => {
    cleanup();
    act(() => {
      useWorkoutStore.setState({
        isWorkoutActive: false,
        activeSessionId: null,
        startTime: null,
      });
    });
  });

  // ── Preview ─────────────────────────────────────────────────────────────────

  it('nextRoutine is null when no active schedule exists', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(null);
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    expect(result.current.nextRoutine).toBeNull();
  });

  it('nextRoutine shows the correct routine and schedule names', () => {
    const db = createMockDb();
    const schedule = makeSchedule();
    const entries = [makeEntry('routine-1', 0)];
    const routine = makeRoutine();

    db.getFirstSync
      .mockReturnValueOnce(schedule) // preview: active schedule
      .mockReturnValueOnce(routine); // preview: routine

    db.getAllSync.mockReturnValueOnce(entries);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    expect(result.current.nextRoutine).toEqual({
      routineId: 'routine-1',
      routineName: 'Push A',
      scheduleName: 'Push/Pull',
    });
  });

  // ── startFreeWorkout ────────────────────────────────────────────────────────

  it('startFreeWorkout inserts a session row with null routine/schedule/snapshot', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(null);
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    act(() => {
      result.current.startFreeWorkout();
    });

    const insertCall = (db.runSync as jest.Mock).mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO workout_sessions'),
    );
    expect(insertCall).toBeDefined();
    // routine_id, schedule_id, snapshot_name should all be null
    expect(insertCall![1][1]).toBeNull(); // routine_id
    expect(insertCall![1][2]).toBeNull(); // schedule_id
    expect(insertCall![1][3]).toBeNull(); // snapshot_name
  });

  it('startFreeWorkout activates the Zustand store', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(null);
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    act(() => {
      result.current.startFreeWorkout();
    });

    expect(useWorkoutStore.getState().isWorkoutActive).toBe(true);
    expect(useWorkoutStore.getState().activeSessionId).not.toBeNull();
  });

  it('startFreeWorkout returns the new session ID', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(null);
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    let sessionId: string = '';
    act(() => {
      sessionId = result.current.startFreeWorkout();
    });

    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe('string');
  });

  // ── startWorkoutFromSchedule ────────────────────────────────────────────────

  it('startWorkoutFromSchedule creates a session row with snapshot data', () => {
    const db = createMockDb();
    const schedule = makeSchedule();
    const entries = [makeEntry('routine-1', 0)];
    const routine = makeRoutine();
    const exercises = [makeRoutineExercise()];

    setupScheduledWorkoutMocks(db, schedule, routine, entries, exercises);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    act(() => {
      result.current.startWorkoutFromSchedule();
    });

    const sessionInsert = (db.runSync as jest.Mock).mock.calls.find((c) =>
      (c[0] as string).includes('INSERT INTO workout_sessions'),
    );
    expect(sessionInsert).toBeDefined();
    // snapshot_name should be the routine name
    expect(sessionInsert![1][3]).toBe('Push A');
    // routine_id should be set
    expect(sessionInsert![1][1]).toBe('routine-1');
  });

  it('startWorkoutFromSchedule inserts placeholder sets for each target set', () => {
    const db = createMockDb();
    const schedule = makeSchedule();
    const entries = [makeEntry('routine-1', 0)];
    const routine = makeRoutine();
    // 2 exercises × 3 sets each = 6 placeholder sets
    const exercises = [
      makeRoutineExercise({ id: 're-1', exercise_id: 'ex-1', target_sets: 3 }),
      makeRoutineExercise({ id: 're-2', exercise_id: 'ex-2', target_sets: 3 }),
    ];

    setupScheduledWorkoutMocks(db, schedule, routine, entries, exercises);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    act(() => {
      result.current.startWorkoutFromSchedule();
    });

    const setInserts = (db.runSync as jest.Mock).mock.calls.filter((c) =>
      (c[0] as string).includes('INSERT INTO workout_sets'),
    );
    expect(setInserts).toHaveLength(6);
  });

  it('startWorkoutFromSchedule wraps all writes in a transaction', () => {
    const db = createMockDb();
    const schedule = makeSchedule();
    const entries = [makeEntry('routine-1', 0)];
    const routine = makeRoutine();
    const exercises = [makeRoutineExercise()];

    setupScheduledWorkoutMocks(db, schedule, routine, entries, exercises);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    db.withTransactionSync.mockClear();

    act(() => {
      result.current.startWorkoutFromSchedule();
    });

    expect(db.withTransactionSync).toHaveBeenCalledTimes(1);
  });

  it('startWorkoutFromSchedule advances the schedule current_position', () => {
    const db = createMockDb();
    const schedule = makeSchedule({ current_position: -1 });
    const entries = [makeEntry('routine-1', 0), makeEntry('routine-2', 1)];
    const routine = makeRoutine();
    const exercises = [makeRoutineExercise()];

    setupScheduledWorkoutMocks(db, schedule, routine, entries, exercises);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    act(() => {
      result.current.startWorkoutFromSchedule();
    });

    const positionUpdate = (db.runSync as jest.Mock).mock.calls.find((c) =>
      (c[0] as string).includes('UPDATE schedules SET current_position'),
    );
    expect(positionUpdate).toBeDefined();
    // From -1 with 2 entries: next position should be 0
    expect(positionUpdate![1][0]).toBe(0);
  });

  it('startWorkoutFromSchedule activates the Zustand store', () => {
    const db = createMockDb();
    const schedule = makeSchedule();
    const entries = [makeEntry('routine-1', 0)];
    const routine = makeRoutine();
    const exercises = [makeRoutineExercise()];

    setupScheduledWorkoutMocks(db, schedule, routine, entries, exercises);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    act(() => {
      result.current.startWorkoutFromSchedule();
    });

    expect(useWorkoutStore.getState().isWorkoutActive).toBe(true);
  });

  it('startWorkoutFromSchedule returns null when there is no active schedule', () => {
    const db = createMockDb();
    db.getFirstSync.mockReturnValue(null);
    db.getAllSync.mockReturnValue([]);

    const wrapper = createDatabaseWrapper(db);
    const { result } = renderHook(() => useWorkoutStarter(), { wrapper });

    let sessionId: string | null = null;
    act(() => {
      sessionId = result.current.startWorkoutFromSchedule();
    });

    expect(sessionId).toBeNull();
    expect(useWorkoutStore.getState().isWorkoutActive).toBe(false);
  });
});
