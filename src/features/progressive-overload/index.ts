/**
 * Progressive Overload feature — public API
 *
 * Exposes the V1 deterministic progressive overload recommender.
 * Consumers depend only on the types and functions exported here, keeping
 * this module fully decoupled from the UI and easy to upgrade to more
 * sophisticated algorithms in the future.
 */

export {
  allSetsHitTarget,
  getCurrentWeight,
  getProgressionRecommendation,
} from './domain/progressive-overload';

export type {
  ExerciseTarget,
  IncreaseWeightRecommendation,
  MaintainWeightRecommendation,
  OverloadRecommendation,
  ProgressionConfig,
  SetRecord,
} from './domain/progressive-overload';
