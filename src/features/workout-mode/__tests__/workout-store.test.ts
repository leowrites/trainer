import type { ActiveWorkoutSession } from '../types';
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
      activeSessionId: null,
      startTime: null,
      activeSession: null,
    });
  });

  it('starts with an inactive workout session', () => {
    const state = useWorkoutStore.getState();
    expect(state.isWorkoutActive).toBe(false);
    expect(state.activeSessionId).toBeNull();
    expect(state.startTime).toBeNull();
    expect(state.activeSession).toBeNull();
  });

  it('activates a workout session with the session snapshot', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    const state = useWorkoutStore.getState();
    expect(state.isWorkoutActive).toBe(true);
    expect(state.activeSessionId).toBe(mockSession.id);
    expect(state.startTime).toBe(mockSession.startTime);
    expect(state.activeSession).toEqual(mockSession);
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

  it('removes a set but preserves the exercise block for future additions', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().deleteSet('set-1');

    expect(useWorkoutStore.getState().activeSession?.exercises[0].sets).toEqual(
      [],
    );
  });

  it('resets all state on endWorkout', () => {
    useWorkoutStore.getState().startWorkout(mockSession);

    useWorkoutStore.getState().endWorkout();

    const state = useWorkoutStore.getState();
    expect(state.isWorkoutActive).toBe(false);
    expect(state.activeSessionId).toBeNull();
    expect(state.startTime).toBeNull();
    expect(state.activeSession).toBeNull();
  });
});
