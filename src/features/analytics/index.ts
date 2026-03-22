/**
 * Analytics feature slice
 *
 * Dashboards and charts for training volume, muscle-group distribution,
 * workout duration trends, and estimated 1-rep-max history.
 */
import React from 'react';

export { useHistoryAnalytics } from './hooks/use-history-analytics';
export { useHistorySessions } from './hooks/use-history-sessions';
export { useHistorySessionDetail } from './hooks/use-history-session-detail';
export { buildDashboardMetrics } from './domain/dashboard-metrics';
export {
  buildHistorySession,
  buildHistorySessions,
  buildHistoryTrendSessions,
} from './domain/history';
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

import type { HistoryNavigatorProps } from './screens/history-navigator';
import type { HistoryScreenProps } from './screens/history-screen';
import type { HistorySessionDetailScreenProps } from './screens/history-session-detail-screen';

export function HistoryNavigator(
  props: HistoryNavigatorProps,
): React.JSX.Element {
  const { HistoryNavigator: HistoryNavigatorComponent } =
    require('./screens/history-navigator') as {
      HistoryNavigator: (
        navigatorProps: HistoryNavigatorProps,
      ) => React.JSX.Element;
    };

  return React.createElement(HistoryNavigatorComponent, props);
}

export function HistoryScreen(props: HistoryScreenProps): React.JSX.Element {
  const { HistoryScreen: HistoryScreenComponent } =
    require('./screens/history-screen') as {
      HistoryScreen: (screenProps: HistoryScreenProps) => React.JSX.Element;
    };

  return React.createElement(HistoryScreenComponent, props);
}

export function HistorySessionDetailScreen(
  props: HistorySessionDetailScreenProps,
): React.JSX.Element {
  const { HistorySessionDetailScreen: HistorySessionDetailScreenComponent } =
    require('./screens/history-session-detail-screen') as {
      HistorySessionDetailScreen: (
        screenProps: HistorySessionDetailScreenProps,
      ) => React.JSX.Element;
    };

  return React.createElement(HistorySessionDetailScreenComponent, props);
}

export type {
  DashboardMetrics,
  HistoryExerciseSummary,
  HistorySession,
  HistorySessionRow,
  HistoryTrendSessionRow,
  HistoryTrendMetric,
  HistoryTrendRange,
  HistoryTrendSeriesByMetric,
  HistorySetRow,
  ProgressiveOverloadCandidate,
  ProgressiveOverloadConfig,
  ProgressiveOverloadRecommendation,
  TrendPoint,
  WeightUnit,
} from './types';
export type { HistoryStackParamList } from './navigation-types';
