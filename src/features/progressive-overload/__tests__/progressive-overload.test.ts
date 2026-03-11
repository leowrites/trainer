import {
  allSetsHitTarget,
  getCurrentWeight,
  getProgressionRecommendation,
} from '../domain/progressive-overload';
import type {
  ExerciseTarget,
  ProgressionConfig,
  SetRecord,
} from '../domain/progressive-overload';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const DEFAULT_TARGET: ExerciseTarget = { targetReps: 8, targetSets: 3 };
const DEFAULT_CONFIG: ProgressionConfig = { weightIncrement: 2.5 };

/** Builds an array of completed sets all at the given weight and reps. */
function buildSets(
  count: number,
  reps: number,
  weight: number,
  isCompleted = true,
): SetRecord[] {
  return Array.from({ length: count }, () => ({ reps, weight, isCompleted }));
}

// ─── getCurrentWeight ─────────────────────────────────────────────────────────

describe('getCurrentWeight', () => {
  it('returns 0 when there are no sets', () => {
    expect(getCurrentWeight([])).toBe(0);
  });

  it('returns 0 when all sets are incomplete', () => {
    const sets = buildSets(3, 8, 100, false);
    expect(getCurrentWeight(sets)).toBe(0);
  });

  it('returns the weight of the last completed set', () => {
    const sets: SetRecord[] = [
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: true },
    ];
    expect(getCurrentWeight(sets)).toBe(100);
  });

  it('ignores incomplete sets when determining weight', () => {
    const sets: SetRecord[] = [
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 0, weight: 100, isCompleted: false },
    ];
    expect(getCurrentWeight(sets)).toBe(100);
  });

  it('returns the last completed set weight when weights differ', () => {
    const sets: SetRecord[] = [
      { reps: 8, weight: 80, isCompleted: true },
      { reps: 8, weight: 90, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: true },
    ];
    expect(getCurrentWeight(sets)).toBe(100);
  });
});

// ─── allSetsHitTarget ─────────────────────────────────────────────────────────

describe('allSetsHitTarget', () => {
  it('returns false when there are no sets', () => {
    expect(allSetsHitTarget([], DEFAULT_TARGET)).toBe(false);
  });

  it('returns false when no sets are completed', () => {
    const sets = buildSets(3, 8, 100, false);
    expect(allSetsHitTarget(sets, DEFAULT_TARGET)).toBe(false);
  });

  it('returns true when all completed sets meet the target reps', () => {
    const sets = buildSets(3, 8, 100);
    expect(allSetsHitTarget(sets, DEFAULT_TARGET)).toBe(true);
  });

  it('returns true when completed sets exceed the target reps', () => {
    const sets = buildSets(3, 10, 100);
    expect(allSetsHitTarget(sets, DEFAULT_TARGET)).toBe(true);
  });

  it('returns false when a completed set falls short of target reps', () => {
    const sets: SetRecord[] = [
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 7, weight: 100, isCompleted: true }, // one rep short
    ];
    expect(allSetsHitTarget(sets, DEFAULT_TARGET)).toBe(false);
  });

  it('returns false when fewer completed sets than targetSets', () => {
    // Only 2 sets completed but target requires 3
    const sets: SetRecord[] = [
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: false },
    ];
    expect(allSetsHitTarget(sets, DEFAULT_TARGET)).toBe(false);
  });

  it('ignores incomplete sets when checking rep targets', () => {
    // 3 completed at target + 1 incomplete at 0 reps → should still pass
    const sets: SetRecord[] = [
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 0, weight: 100, isCompleted: false },
    ];
    expect(allSetsHitTarget(sets, DEFAULT_TARGET)).toBe(true);
  });

  it('handles a single-set target correctly', () => {
    const singleSetTarget: ExerciseTarget = { targetReps: 5, targetSets: 1 };
    expect(
      allSetsHitTarget(
        [{ reps: 5, weight: 50, isCompleted: true }],
        singleSetTarget,
      ),
    ).toBe(true);
    expect(
      allSetsHitTarget(
        [{ reps: 4, weight: 50, isCompleted: true }],
        singleSetTarget,
      ),
    ).toBe(false);
  });
});

// ─── getProgressionRecommendation ─────────────────────────────────────────────

describe('getProgressionRecommendation', () => {
  it('recommends maintaining weight at 0 when there is no history', () => {
    const result = getProgressionRecommendation(
      [],
      DEFAULT_TARGET,
      DEFAULT_CONFIG,
    );
    expect(result.type).toBe('maintain');
    expect(result.suggestedWeight).toBe(0);
  });

  it('recommends increasing weight when all sets hit target', () => {
    const sets = buildSets(3, 8, 100);
    const result = getProgressionRecommendation(
      sets,
      DEFAULT_TARGET,
      DEFAULT_CONFIG,
    );
    expect(result.type).toBe('increase_weight');
    expect(result.suggestedWeight).toBe(102.5);
  });

  it('applies the configured weight increment', () => {
    const sets = buildSets(3, 8, 60);
    const config: ProgressionConfig = { weightIncrement: 5 };
    const result = getProgressionRecommendation(sets, DEFAULT_TARGET, config);
    expect(result.type).toBe('increase_weight');
    expect(result.suggestedWeight).toBe(65);
  });

  it('recommends maintaining weight when a set fell short of target reps', () => {
    const sets: SetRecord[] = [
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 6, weight: 100, isCompleted: true }, // missed target
    ];
    const result = getProgressionRecommendation(
      sets,
      DEFAULT_TARGET,
      DEFAULT_CONFIG,
    );
    expect(result.type).toBe('maintain');
    expect(result.suggestedWeight).toBe(100);
  });

  it('recommends maintaining weight when not all sets were completed', () => {
    const sets: SetRecord[] = [
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 8, weight: 100, isCompleted: true },
      { reps: 0, weight: 100, isCompleted: false },
    ];
    const result = getProgressionRecommendation(
      sets,
      DEFAULT_TARGET,
      DEFAULT_CONFIG,
    );
    expect(result.type).toBe('maintain');
    expect(result.suggestedWeight).toBe(100);
  });

  it('includes a human-readable reason string in every recommendation', () => {
    const progressSets = buildSets(3, 8, 100);
    const progressResult = getProgressionRecommendation(
      progressSets,
      DEFAULT_TARGET,
      DEFAULT_CONFIG,
    );
    expect(typeof progressResult.reason).toBe('string');
    expect(progressResult.reason.length).toBeGreaterThan(0);

    const maintainResult = getProgressionRecommendation(
      [],
      DEFAULT_TARGET,
      DEFAULT_CONFIG,
    );
    expect(typeof maintainResult.reason).toBe('string');
    expect(maintainResult.reason.length).toBeGreaterThan(0);
  });

  it('does not mutate the input sets array', () => {
    const sets = buildSets(3, 8, 100);
    const original = sets.map((s) => ({ ...s }));
    getProgressionRecommendation(sets, DEFAULT_TARGET, DEFAULT_CONFIG);
    expect(sets).toEqual(original);
  });

  it('works with a 1 kg increment', () => {
    const sets = buildSets(3, 10, 40);
    const config: ProgressionConfig = { weightIncrement: 1 };
    const result = getProgressionRecommendation(sets, DEFAULT_TARGET, config);
    expect(result.type).toBe('increase_weight');
    expect(result.suggestedWeight).toBe(41);
  });

  it('handles sets exceeding the target reps as a qualifying progression', () => {
    // Reps above target should still trigger progression
    const sets = buildSets(3, 12, 80); // target is 8 reps
    const result = getProgressionRecommendation(
      sets,
      DEFAULT_TARGET,
      DEFAULT_CONFIG,
    );
    expect(result.type).toBe('increase_weight');
    expect(result.suggestedWeight).toBe(82.5);
  });
});
