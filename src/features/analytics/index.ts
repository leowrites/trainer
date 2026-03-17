/**
 * Analytics feature slice
 *
 * Dashboards and charts for training volume, muscle-group distribution,
 * workout duration trends, and estimated 1-rep-max history.
 */
export { HistoryScreen } from './screens/history-screen';
export { useHistoryAnalytics } from './hooks/use-history-analytics';
export { buildHistorySessions } from './domain/history';
export { buildHoursTrend, buildVolumeTrend } from './domain/trends';
export { recommendProgressions } from './domain/progressive-overload';
export type {
  HistoryExerciseSummary,
  HistorySession,
  HistorySessionRow,
  HistorySetRow,
  ProgressiveOverloadCandidate,
  ProgressiveOverloadConfig,
  ProgressiveOverloadRecommendation,
  TrendPoint,
} from './types';
