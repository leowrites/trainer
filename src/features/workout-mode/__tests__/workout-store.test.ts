import {
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
} from '@shared/constants';
import { selectActiveWorkoutSnapshot, useWorkoutStore } from '../store';
import type { ActiveWorkoutSession } from '../types';

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
    useWorkoutStore.getState().endWorkout();
  });

  it('starts with an inactive workout session', () => {
    const state = useWorkoutStore.getState();

    expect(state.isWorkoutActive).toBe(false);
    expect(state.isWorkoutCollapsed).toBe(false);
    expect(state.activeSessionId).toBeNull();
    expect(state.startTime).toBeNull();
    expect(state.activeSessionMeta).toBeNull();
    expect(state.activeExerciseOrder).toEqual([]);
    expect(state.activeRouteSetIds).toEqual([]);
    expect(state.restTimerEndsAt).toBeNull();
    expect(state.exerciseTimerEndsAtByExerciseId).toEqual({});
    expect(state.exerciseTimerDurationByExerciseId).toEqual({});
  });

  it('hydrates a normalized workout session snapshot', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    const state = useWorkoutStore.getState();

    expect(state.isWorkoutActive).toBe(true);
    expect(state.activeSessionMeta?.title).toBe('Push A');
    expect(state.activeExerciseOrder).toEqual(['exercise-1']);
    expect(state.activeRouteSetIds).toEqual(['set-1']);
    expect(selectActiveWorkoutSnapshot(state)).toEqual(mockSession);
    expect(state.exerciseTimerEndsAtByExerciseId).toEqual({
      'exercise-1': null,
    });
    expect(state.exerciseTimerDurationByExerciseId).toEqual({
      'exercise-1': 60,
    });
  });

  it('updates only the targeted set record and preserves sibling references', () => {
    useWorkoutStore.getState().startWorkout({
      ...mockSession,
      exercises: [
        {
          ...mockSession.exercises[0],
          sets: [
            mockSession.exercises[0].sets[0],
            {
              id: 'set-2',
              exerciseId: 'exercise-1',
              reps: 10,
              weight: 155,
              isCompleted: false,
              targetSets: 3,
              targetReps: 10,
            },
          ],
        },
      ],
    });

    const beforeState = useWorkoutStore.getState();
    const untouchedSet = beforeState.activeSetsById['set-2'];
    const exerciseRecord = beforeState.activeExercisesById['exercise-1'];
    const routeSetIds = beforeState.activeRouteSetIds;

    useWorkoutStore.getState().updateSet('set-1', {
      reps: 10,
      weight: 145,
      isCompleted: true,
    });

    const afterState = useWorkoutStore.getState();

    expect(afterState.activeSetsById['set-1']).toMatchObject({
      reps: 10,
      weight: 145,
      isCompleted: true,
    });
    expect(afterState.activeSetsById['set-2']).toBe(untouchedSet);
    expect(afterState.activeExercisesById['exercise-1']).toBe(exerciseRecord);
    expect(afterState.activeRouteSetIds).toBe(routeSetIds);
  });

  it('keeps route ids stable for set edits and rebuilds them only for structural changes', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    const initialRouteSetIds = useWorkoutStore.getState().activeRouteSetIds;

    useWorkoutStore.getState().updateSet('set-1', { reps: 9 });
    expect(useWorkoutStore.getState().activeRouteSetIds).toBe(
      initialRouteSetIds,
    );

    useWorkoutStore.getState().addSet('exercise-1', {
      id: 'set-2',
      exerciseId: 'exercise-1',
      reps: 8,
      weight: 135,
      isCompleted: false,
      targetSets: 3,
      targetReps: 8,
    });

    expect(useWorkoutStore.getState().activeRouteSetIds).toEqual([
      'set-1',
      'set-2',
    ]);
  });

  it('preserves normalized session references when timer state changes', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    useWorkoutStore.getState().startWorkout(mockSession);

    const beforeState = useWorkoutStore.getState();

    useWorkoutStore.getState().setExerciseTimerDuration('exercise-1', 90);
    useWorkoutStore.getState().startExerciseTimer('exercise-1', 90);
    useWorkoutStore.getState().startRestTimer(120);

    const afterState = useWorkoutStore.getState();

    expect(afterState.activeSessionMeta).toBe(beforeState.activeSessionMeta);
    expect(afterState.activeExerciseOrder).toBe(
      beforeState.activeExerciseOrder,
    );
    expect(afterState.activeExercisesById).toBe(
      beforeState.activeExercisesById,
    );
    expect(afterState.activeSetsById).toBe(beforeState.activeSetsById);
    expect(afterState.exerciseTimerDurationByExerciseId).toEqual({
      'exercise-1': 90,
    });
    expect(afterState.exerciseTimerEndsAtByExerciseId).toEqual({
      'exercise-1': 91_000,
    });
    expect(afterState.restTimerEndsAt).toBe(121_000);

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
    expect(state.activeSessionMeta).toBeNull();
    expect(state.activeExerciseOrder).toEqual([]);
    expect(state.activeExercisesById).toEqual({});
    expect(state.activeSetsById).toEqual({});
    expect(state.activeRouteSetIds).toEqual([]);
    expect(state.restTimerEndsAt).toBeNull();
    expect(state.exerciseTimerEndsAtByExerciseId).toEqual({});
    expect(state.exerciseTimerDurationByExerciseId).toEqual({});
  });
});
