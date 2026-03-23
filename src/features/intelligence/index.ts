/**
 * Intelligence feature slice.
 *
 * Deterministic training intelligence derived from local workout history.
 */

import React from 'react';

export { useIntelligenceOverview } from './hooks/use-intelligence-overview';
export { useSessionIntelligence } from './hooks/use-session-intelligence';
export { useTrainingGoals } from './hooks/use-training-goals';
export { loadExerciseCapabilities } from './metrics/capabilities';
export {
  buildExerciseExposureIndex,
  buildExerciseExposures,
} from './metrics/exposures';
export {
  buildExerciseTrendSummaries,
  buildRoutineTrendSummaries,
} from './metrics/trends';
export {
  selectHomeExerciseHighlights,
  selectHomePrimaryInsight,
} from './selectors/home-surface';
export {
  buildSessionClassifications,
  buildSessionRecordBadges,
} from './classifiers/session-signals';
export { buildSessionPrescriptions } from './prescriptions/recommendations';
export {
  buildGoalProgressSummaries,
  sanitizeTrainingGoalInput,
} from './goals/domain';
export {
  createTrainingGoal,
  deleteTrainingGoal,
  listTrainingGoals,
  updateTrainingGoal,
} from './goals/repository';

import type { GoalsScreenProps } from './screens/goals-screen';

export function GoalsScreen(props: GoalsScreenProps): React.JSX.Element {
  const { GoalsScreen: GoalsScreenComponent } =
    require('./screens/goals-screen') as {
      GoalsScreen: (screenProps: GoalsScreenProps) => React.JSX.Element;
    };

  return React.createElement(GoalsScreenComponent, props);
}

export type {
  DataQuality,
  ExerciseCapability,
  ExerciseClassification,
  ExerciseExposure,
  HomeExerciseHighlight,
  HomePrimaryInsight,
  ExerciseTrendSummary,
  GoalProgressSummary,
  IntelligenceBadge,
  QualityLevel,
  QualityReason,
  SessionIntelligence,
  SessionPrescription,
  StrengthEstimationMode,
  TrainingGoalInput,
  TrainingGoalViewModel,
} from './types';
