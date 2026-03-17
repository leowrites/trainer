import { recommendProgressions } from '../domain/progressive-overload';
import type { ProgressiveOverloadCandidate } from '../types';

describe('recommendProgressions', () => {
  const candidates: ProgressiveOverloadCandidate[] = [
    {
      exerciseId: 'exercise-1',
      exerciseName: 'Bench Press',
      targetSets: 3,
      targetReps: 10,
      sets: [
        { reps: 10, weight: 100, isCompleted: true },
        { reps: 11, weight: 100, isCompleted: true },
        { reps: 10, weight: 100, isCompleted: true },
      ],
    },
  ];

  it('recommends a fixed progression when every planned set hits target reps', () => {
    expect(
      recommendProgressions(candidates, {
        weightIncrement: 5,
        unit: 'kg',
        precision: 1,
      }),
    ).toEqual([
      {
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        targetReps: 10,
        completedSetCount: 3,
        currentWeight: 100,
        recommendedWeight: 105,
        weightIncrement: 5,
        unit: 'kg',
      },
    ]);
  });

  it('does not recommend progression when a planned set is incomplete or misses the rep target', () => {
    expect(
      recommendProgressions(
        [
          {
            exerciseId: 'exercise-1',
            exerciseName: 'Bench Press',
            targetSets: 3,
            targetReps: 10,
            sets: [
              { reps: 10, weight: 100, isCompleted: true },
              { reps: 9, weight: 100, isCompleted: true },
              { reps: 10, weight: 100, isCompleted: false },
            ],
          },
        ],
        { weightIncrement: 5, unit: 'kg' },
      ),
    ).toEqual([]);
  });

  it('returns no recommendations when the configured increment is invalid', () => {
    expect(
      recommendProgressions(candidates, {
        weightIncrement: 0,
        unit: 'kg',
      }),
    ).toEqual([]);
  });

  it('still recommends progression when extra completed sets exist beyond the target', () => {
    expect(
      recommendProgressions(
        [
          {
            exerciseId: 'exercise-1',
            exerciseName: 'Bench Press',
            targetSets: 3,
            targetReps: 10,
            sets: [
              { reps: 10, weight: 100, isCompleted: true },
              { reps: 10, weight: 100, isCompleted: true },
              { reps: 10, weight: 100, isCompleted: true },
              { reps: 8, weight: 100, isCompleted: true },
            ],
          },
        ],
        { weightIncrement: 2.5, unit: 'kg', precision: 1 },
      ),
    ).toEqual([
      expect.objectContaining({
        exerciseId: 'exercise-1',
        recommendedWeight: 102.5,
      }),
    ]);
  });
});
