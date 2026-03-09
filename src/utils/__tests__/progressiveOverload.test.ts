import { suggestNextWorkout, calculateRepAchievementRate, parseReps, WorkoutSetGroup } from '../progressiveOverload';
import { WorkoutSet } from '../../types';

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 'set1',
    workoutId: 'w1',
    exerciseId: 'ex1',
    setNumber: 1,
    reps: 10,
    weight: 100,
    weightUnit: 'kg',
    isWarmup: false,
    completed: true,
    notes: '',
    ...overrides,
  };
}

function makeGroup(
  sets: WorkoutSet[],
  targetReps: string,
  targetWeight: number
): WorkoutSetGroup {
  return {
    exerciseId: sets[0]?.exerciseId ?? 'ex1',
    sets,
    targetReps,
    targetWeight,
  };
}

describe('parseReps', () => {
  it('parses range like "8-12"', () => {
    expect(parseReps('8-12')).toEqual({ min: 8, max: 12 });
  });

  it('parses single number like "10"', () => {
    expect(parseReps('10')).toEqual({ min: 10, max: 10 });
  });
});

describe('calculateRepAchievementRate', () => {
  it('returns 1.0 when all reps achieved', () => {
    const sets = [makeSet({ reps: 10 }), makeSet({ reps: 10 })];
    expect(calculateRepAchievementRate(sets, '10')).toBe(1.0);
  });

  it('returns 0.5 when half reps achieved', () => {
    const sets = [makeSet({ reps: 5 })];
    expect(calculateRepAchievementRate(sets, '10')).toBe(0.5);
  });

  it('excludes warmup sets', () => {
    const sets = [makeSet({ reps: 10, isWarmup: true }), makeSet({ reps: 10 })];
    expect(calculateRepAchievementRate(sets, '10')).toBe(1.0);
  });

  it('excludes uncompleted sets', () => {
    const sets = [makeSet({ reps: 10, completed: false }), makeSet({ reps: 10 })];
    expect(calculateRepAchievementRate(sets, '10')).toBe(1.0);
  });

  it('returns 0 when no completed sets', () => {
    const sets = [makeSet({ completed: false })];
    expect(calculateRepAchievementRate(sets, '10')).toBe(0);
  });
});

describe('suggestNextWorkout', () => {
  it('returns null for empty input', () => {
    expect(suggestNextWorkout([])).toBeNull();
  });

  it('increases weight when all reps achieved across all workouts', () => {
    const groups = [
      makeGroup([makeSet({ reps: 10 }), makeSet({ reps: 10 })], '10', 100),
      makeGroup([makeSet({ reps: 10 }), makeSet({ reps: 10 })], '10', 100),
      makeGroup([makeSet({ reps: 10 }), makeSet({ reps: 10 })], '10', 100),
    ];
    const result = suggestNextWorkout(groups, 'kg');
    expect(result).not.toBeNull();
    expect(result!.suggestedWeight).toBe(102.5);
    expect(result!.reason).toContain('Increase weight');
  });

  it('keeps weight when 75-99% reps achieved', () => {
    const groups = [
      makeGroup([makeSet({ reps: 8 }), makeSet({ reps: 8 })], '10', 100),
      makeGroup([makeSet({ reps: 8 }), makeSet({ reps: 8 })], '10', 100),
    ];
    const result = suggestNextWorkout(groups, 'kg');
    expect(result).not.toBeNull();
    expect(result!.suggestedWeight).toBe(100);
    expect(result!.reason).toContain('same weight');
  });

  it('deloads when fewer than 75% reps achieved', () => {
    const groups = [
      makeGroup([makeSet({ reps: 5 }), makeSet({ reps: 5 })], '10', 100),
      makeGroup([makeSet({ reps: 5 }), makeSet({ reps: 5 })], '10', 100),
    ];
    const result = suggestNextWorkout(groups, 'kg');
    expect(result).not.toBeNull();
    expect(result!.suggestedWeight).toBe(90);
    expect(result!.reason).toContain('Deload');
  });

  it('increases by 5lbs when unit is lbs', () => {
    const groups = [
      makeGroup([makeSet({ reps: 10, weightUnit: 'lbs' })], '10', 100),
    ];
    const result = suggestNextWorkout(groups, 'lbs');
    expect(result).not.toBeNull();
    expect(result!.suggestedWeight).toBe(105);
  });

  it('works with single workout', () => {
    const groups = [makeGroup([makeSet({ reps: 10 })], '10', 80)];
    const result = suggestNextWorkout(groups, 'kg');
    expect(result).not.toBeNull();
    expect(result!.suggestedWeight).toBe(82.5);
  });

  it('preserves target rep range in suggestion', () => {
    const groups = [makeGroup([makeSet({ reps: 12 })], '8-12', 60)];
    const result = suggestNextWorkout(groups, 'kg');
    expect(result).not.toBeNull();
    expect(result!.suggestedReps).toBe('8-12');
  });
});
