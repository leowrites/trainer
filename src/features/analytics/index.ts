/**
 * Analytics feature slice
 *
 * Dashboards and charts for training volume, muscle-group distribution,
 * workout duration trends, and estimated 1-rep-max history.
 */
export { HistoryScreen } from './screens/history-screen';
export { useAnalytics } from './hooks/use-analytics';
export type { VolumeDataPoint, VolumeDataRow } from './domain/volume-over-time';
export { formatVolume } from './domain/volume-over-time';
export type { HoursDataPoint, HoursDataRow } from './domain/hours-over-time';
export { formatHours } from './domain/hours-over-time';
