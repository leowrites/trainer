import type { ActiveWorkoutSession } from '../types';
import {
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
} from '@shared/constants';
import { useWorkoutStore } from '../store';

const mockSession: ActiveWorkoutSession = {
  id: 'session-1',
  title: 'Push A',
  startTime: 1_700_000_000_000,
  isFreeWorkout: false,
  exercises: [
    {
      exerciseId: 'exercise-1',
      exerciseName: 'Bench Press',
      sets: [
        {
          id: 'set-1',
          exerciseId: 'exercise-1',
          reps: 8,
          weight: 135,
          isCompleted: false,
          targetSets: 3,
          targetReps: 8,
        },
      ],
      targetSets: 3,
      targetReps: 8,
    },
  ],
};

describe('useWorkoutStore', () => {
  beforeEach(() => {
    useWorkoutStore.setState({
      isWorkoutActive: false,
      isWorkoutCollapsed: false,
      activeSessionId: null,
      startTime: null,
      activeSession: null,
      restTimerEndsAt: null,
      exerciseTimerEndsAtByExerciseId: {},
      exerciseTimerDurationByExerciseId: {},
    });
  });

  it('starts with an inactive workout session', () => {
    const state = useWorkoutStore.getState();
    expect(state.isWorkoutActive).toBe(false);
    expect(state.isWorkoutCollapsed).toBe(false);
    expect(state.activeSessionId).toBeNull();
    expect(state.startTime).toBeNull();
    expect(state.activeSession).toBeNull();
    expect(state.restTimerEndsAt).toBeNull();
    expect(state.exerciseTimerEndsAtByExerciseId).toEqual({});
    expect(state.exerciseTimerDurationByExerciseId).toEqual({});
  });

  it('activates a workout session with the session snapshot', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    const state = useWorkoutStore.getState();
    expect(state.isWorkoutActive).toBe(true);
    expect(state.isWorkoutCollapsed).toBe(false);
    expect(state.activeSessionId).toBe(mockSession.id);
    expect(state.startTime).toBe(mockSession.startTime);
    expect(state.activeSession).toEqual(mockSession);
    expect(state.exerciseTimerEndsAtByExerciseId).toEqual({
      'exercise-1': null,
    });
    expect(state.exerciseTimerDurationByExerciseId).toEqual({
      'exercise-1': 60,
    });
  });

  it('collapses and expands an active workout session', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().collapseWorkout();
    expect(useWorkoutStore.getState().isWorkoutCollapsed).toBe(true);

    useWorkoutStore.getState().expandWorkout();
    expect(useWorkoutStore.getState().isWorkoutCollapsed).toBe(false);
  });

  it('updates an existing set in the active session', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().updateSet('set-1', {
      reps: 10,
      weight: 145,
      isCompleted: true,
    });

    expect(
      useWorkoutStore.getState().activeSession?.exercises[0].sets[0],
    ).toMatchObject({
      reps: 10,
      weight: 145,
      isCompleted: true,
    });
  });

  it('appends a new set to the matching exercise block', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().addSet('exercise-1', {
      id: 'set-2',
      exerciseId: 'exercise-1',
      reps: 8,
      weight: 135,
      isCompleted: false,
      targetSets: 3,
      targetReps: 8,
    });

    expect(
      useWorkoutStore
        .getState()
        .activeSession?.exercises[0].sets.map((setItem) => setItem.id),
    ).toEqual(['set-1', 'set-2']);
  });

  it('adds and removes exercise blocks from the active session', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().addExercise({
      exerciseId: 'exercise-2',
      exerciseName: 'Goblet Squat',
      targetSets: null,
      targetReps: null,
      sets: [],
    });

    expect(
      useWorkoutStore
        .getState()
        .activeSession?.exercises.map((exercise) => exercise.exerciseId),
    ).toEqual(['exercise-1', 'exercise-2']);

    useWorkoutStore.getState().removeExercise('exercise-2');

    expect(
      useWorkoutStore
        .getState()
        .activeSession?.exercises.map((exercise) => exercise.exerciseId),
    ).toEqual(['exercise-1']);
  });

  it('removes planned routine exercise blocks from the store', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().removeExercise('exercise-1');

    expect(useWorkoutStore.getState().activeSession?.exercises).toEqual([]);
  });

  it('removes a set but preserves the exercise block for future additions', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().deleteSet('set-1');

    expect(useWorkoutStore.getState().activeSession?.exercises[0].sets).toEqual(
      [],
    );
  });

  it('starts and clears a rest timer for the active workout', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().startRestTimer(120);
    expect(useWorkoutStore.getState().restTimerEndsAt).not.toBeNull();

    useWorkoutStore.getState().clearRestTimer();
    expect(useWorkoutStore.getState().restTimerEndsAt).toBeNull();
  });

  it('persists per-exercise timers across collapse and expand until the workout ends', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().setExerciseTimerDuration('exercise-1', 90);
    useWorkoutStore.getState().startExerciseTimer('exercise-1', 90);
    useWorkoutStore.getState().collapseWorkout();
    useWorkoutStore.getState().expandWorkout();

    expect(
      useWorkoutStore.getState().exerciseTimerDurationByExerciseId,
    ).toEqual({
      'exercise-1': 90,
    });
    expect(useWorkoutStore.getState().exerciseTimerEndsAtByExerciseId).toEqual({
      'exercise-1': 91_000,
    });

    useWorkoutStore.getState().endWorkout();

    expect(useWorkoutStore.getState().exerciseTimerEndsAtByExerciseId).toEqual(
      {},
    );
    expect(
      useWorkoutStore.getState().exerciseTimerDurationByExerciseId,
    ).toEqual({});

    jest.restoreAllMocks();
  });

  it('clamps invalid rest timer durations into the supported range', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().startRestTimer(Number.NaN);
    expect(useWorkoutStore.getState().restTimerEndsAt).toBe(
      1_000 + DEFAULT_REST_SECONDS * 1_000,
    );

    useWorkoutStore.getState().startRestTimer(-25);
    expect(useWorkoutStore.getState().restTimerEndsAt).toBe(
      1_000 + MIN_REST_SECONDS * 1_000,
    );

    useWorkoutStore.getState().startRestTimer(MAX_REST_SECONDS + 25);
    expect(useWorkoutStore.getState().restTimerEndsAt).toBe(
      1_000 + MAX_REST_SECONDS * 1_000,
    );

    jest.restoreAllMocks();
  });

  it('resets all state on endWorkout', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().endWorkout();

    const state = useWorkoutStore.getState();
    expect(state.isWorkoutActive).toBe(false);
    expect(state.isWorkoutCollapsed).toBe(false);
    expect(state.activeSessionId).toBeNull();
    expect(state.startTime).toBeNull();
    expect(state.activeSession).toBeNull();
    expect(state.restTimerEndsAt).toBeNull();
    expect(state.exerciseTimerEndsAtByExerciseId).toEqual({});
    expect(state.exerciseTimerDurationByExerciseId).toEqual({});
  });
});
