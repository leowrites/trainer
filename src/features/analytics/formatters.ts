import type { HistorySession } from './types';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function getLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-');
}

export function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

export function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatSessionDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${formatSessionDate(timestamp)} ${hour12}:${pad(date.getMinutes())} ${period}`;
}

export function formatDurationMinutes(durationMinutes: number | null): string {
  if (durationMinutes === null) {
    return 'Duration unavailable';
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

export function formatWeight(value: number, unit: string): string {
  return `${formatCompactNumber(value)} ${unit}`;
}

export function formatSessionSummary(session: HistorySession): string {
  const exerciseLabel =
    session.exerciseCount === 1
      ? '1 exercise'
      : `${session.exerciseCount} exercises`;
  const setLabel =
    session.totalSets === 1
      ? `${session.totalCompletedSets}/1 set`
      : `${session.totalCompletedSets}/${session.totalSets} sets`;
  return `${exerciseLabel} • ${setLabel}`;
}
