/**
 * Progressive Overload domain logic (V1 — deterministic)
 *
 * Pure, framework-agnostic functions that determine whether an exercise
 * warrants a weight increase in the next session.
 *
 * Rule: if **every** completed set in the last session met or exceeded the
 * target rep count, recommend increasing the weight by a fixed increment.
 * Otherwise, recommend maintaining the current weight.
 *
 * These functions have no side effects and do not touch the database, making
 * them easy to unit-test in isolation and straightforward to swap for a more
 * sophisticated algorithm (e.g., ML-based) later.
 */

// ─── Input types ─────────────────────────────────────────────────────────────

/**
 * A single recorded set from a historical workout session.
 */
export interface SetRecord {
  /** Number of reps actually performed. */
  reps: number;
  /** Weight used for this set (in the user's preferred unit). */
  weight: number;
  /** Whether the set was marked as completed by the athlete. */
  isCompleted: boolean;
}

/**
 * The athlete's goal configuration for a specific exercise within a routine.
 */
export interface ExerciseTarget {
  /** Number of reps the athlete aims to complete per set. */
  targetReps: number;
  /** Number of sets planned for this exercise. */
  targetSets: number;
}

/**
 * Configures how weight should progress between sessions.
 *
 * The increment is expressed in whatever unit the caller uses (lbs or kg) —
 * this module is unit-agnostic.
 */
export interface ProgressionConfig {
  /** Amount to add to the working weight when progression is warranted. */
  weightIncrement: number;
}

// ─── Output types ─────────────────────────────────────────────────────────────

/** Recommendation to increase the working weight next session. */
export interface IncreaseWeightRecommendation {
  type: 'increase_weight';
  /** Suggested weight for the next session. */
  suggestedWeight: number;
  reason: string;
}

/** Recommendation to keep the current weight next session. */
export interface MaintainWeightRecommendation {
  type: 'maintain';
  /** Suggested weight for the next session (same as current). */
  suggestedWeight: number;
  reason: string;
}

/** Discriminated union of all possible recommendations. */
export type OverloadRecommendation =
  | IncreaseWeightRecommendation
  | MaintainWeightRecommendation;

// ─── Domain logic ─────────────────────────────────────────────────────────────

/**
 * Returns the weight used in the most recent completed set, or `0` when no
 * completed sets exist.
 *
 * This is the baseline weight that a recommendation is calculated from.
 */
export function getCurrentWeight(sets: SetRecord[]): number {
  const completedSets = sets.filter((s) => s.isCompleted);
  if (completedSets.length === 0) return 0;
  return completedSets[completedSets.length - 1].weight;
}

/**
 * Returns `true` when every completed set in the session met or exceeded the
 * target rep count **and** the number of completed sets satisfies the target
 * set count.
 *
 * Returns `false` when there are no completed sets so that a missing history
 * never triggers an unwarranted progression.
 */
export function allSetsHitTarget(
  sets: SetRecord[],
  target: ExerciseTarget,
): boolean {
  const completedSets = sets.filter((s) => s.isCompleted);
  if (completedSets.length === 0) return false;
  if (completedSets.length < target.targetSets) return false;
  return completedSets.every((s) => s.reps >= target.targetReps);
}

/**
 * Given the historical sets for a **single exercise** in the most recently
 * completed session, returns a typed recommendation for the next session.
 *
 * @param historicalSets  - All sets logged for this exercise in the last session.
 * @param target          - The athlete's rep/set goals for this exercise.
 * @param config          - Progression configuration (weight increment, etc.).
 * @returns A typed {@link OverloadRecommendation}.
 */
export function getProgressionRecommendation(
  historicalSets: SetRecord[],
  target: ExerciseTarget,
  config: ProgressionConfig,
): OverloadRecommendation {
  const currentWeight = getCurrentWeight(historicalSets);

  if (allSetsHitTarget(historicalSets, target)) {
    return {
      type: 'increase_weight',
      suggestedWeight: currentWeight + config.weightIncrement,
      reason: `All ${target.targetSets} sets hit ${target.targetReps} reps — add ${config.weightIncrement} to the bar next session.`,
    };
  }

  if (historicalSets.length === 0) {
    return {
      type: 'maintain',
      suggestedWeight: 0,
      reason: 'No historical data — start at any comfortable weight.',
    };
  }

  return {
    type: 'maintain',
    suggestedWeight: currentWeight,
    reason: 'Not all sets completed at target reps — repeat the same weight.',
  };
}
