import { buildFocusedWorkoutViewModel } from '../domain/focused-session';
import type { ActiveWorkoutSession } from '../types';

function buildSession(
  overrides: Partial<ActiveWorkoutSession> = {},
): ActiveWorkoutSession {
  return {
    id: 'session-1',
    title: 'Push A',
    startTime: 1,
    isFreeWorkout: false,
    exercises: [
      {
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        targetSets: 1,
        targetRepsMin: 8,
        targetRepsMax: 10,
        sets: [
          {
            id: 'set-1',
            exerciseId: 'exercise-1',
            reps: 8,
            weight: 185,
            targetWeight: 190,
            isCompleted: false,
            targetSets: 1,
            targetRepsMin: 8,
            targetRepsMax: 10,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function buildViewModel(
  selectedReps: number,
): ReturnType<typeof buildFocusedWorkoutViewModel> {
  const session = buildSession();
  const exercise = session.exercises[0];
  const set = exercise.sets[0];

  return buildFocusedWorkoutViewModel({
    exercise: {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      targetReps: exercise.targetReps ?? null,
      targetRepsMin: exercise.targetRepsMin ?? null,
      targetRepsMax: exercise.targetRepsMax ?? null,
    },
    set,
    setNumber: 1,
    totalSetsForExercise: 1,
    totalRemainingSets: 0,
    selectedReps,
    selectedWeight: set.weight,
    selectedRir: 1,
    previousPerformance: {
      reps: 8,
      weight: 185,
      completedAt: 1,
    },
  });
}

describe('focused session domain', () => {
  it('builds a target label for ranged prescriptions', () => {
    expect(buildViewModel(9).guidance.targetLabel).toBe('190 lbs x 8-10');
  });

  it('returns below-range guidance', () => {
    expect(buildViewModel(7).guidance.text).toBe('Aim for 8-10');
  });

  it('returns in-range guidance before the top rep', () => {
    expect(buildViewModel(9).guidance.text).toBe('Push for 10');
  });

  it('returns top-of-range guidance', () => {
    expect(buildViewModel(10).guidance.text).toBe('On target');
  });

  it('returns above-range guidance', () => {
    expect(buildViewModel(11).guidance.text).toBe('Strong set');
  });
});
