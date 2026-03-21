/**
 * Analytics feature slice
 *
 * Dashboards and charts for training volume, muscle-group distribution,
 * workout duration trends, and estimated 1-rep-max history.
 */
export { HistoryNavigator } from './screens/history-navigator';
export { HistoryScreen } from './screens/history-screen';
export { HistorySessionDetailScreen } from './screens/history-session-detail-screen';
export { useHistoryAnalytics } from './hooks/use-history-analytics';
export { buildDashboardMetrics } from './domain/dashboard-metrics';
export { buildHistorySessions } from './domain/history';
export { findHistorySessionById } from './domain/history-session-selector';
export { filterSessionsByTrendRange } from './domain/history-trend-range';
export {
  buildHoursTrend,
  buildRepsTrend,
  buildSetsTrend,
  buildTrendSeriesByMetric,
  buildVolumeTrend,
} from './domain/trends';
export { recommendProgressions } from './domain/progressive-overload';
export type {
  DashboardMetrics,
  HistoryExerciseSummary,
  HistorySession,
  HistorySessionRow,
  HistoryTrendMetric,
  HistoryTrendRange,
  HistoryTrendSeriesByMetric,
  HistorySetRow,
  ProgressiveOverloadCandidate,
  ProgressiveOverloadConfig,
  ProgressiveOverloadRecommendation,
  TrendPoint,
} from './types';
export type { HistoryStackParamList } from './navigation-types';
