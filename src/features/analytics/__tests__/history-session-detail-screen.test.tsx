import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { HistorySessionDetailScreen } from '../screens/history-session-detail-screen';
import { useHistoryAnalytics } from '../hooks/use-history-analytics';
import type { HistorySession } from '../types';

jest.mock('../hooks/use-history-analytics', () => ({
  useHistoryAnalytics: jest.fn(),
}));

const mockUseHistoryAnalytics = jest.mocked(useHistoryAnalytics);

function buildSession(overrides: Partial<HistorySession> = {}): HistorySession {
  return {
    id: 'session-1',
    routineId: 'routine-1',
    routineName: 'Upper A',
    startTime: new Date('2026-03-10T15:00:00.000Z').getTime(),
    endTime: new Date('2026-03-10T16:10:00.000Z').getTime(),
    durationMinutes: 70,
    totalSets: 3,
    totalCompletedSets: 3,
    totalReps: 30,
    totalVolume: 3000,
    exerciseCount: 1,
    exercises: [
      {
        exerciseId: 'exercise-1',
        exerciseName: 'Bench Press',
        targetSets: 3,
        targetReps: 10,
        sets: [
          {
            id: 'set-1',
            exerciseId: 'exercise-1',
            reps: 10,
            weight: 100,
            isCompleted: true,
          },
          {
            id: 'set-2',
            exerciseId: 'exercise-1',
            reps: 10,
            weight: 100,
            isCompleted: true,
          },
          {
            id: 'set-3',
            exerciseId: 'exercise-1',
            reps: 10,
            weight: 100,
            isCompleted: true,
          },
        ],
        totalSets: 3,
        completedSets: 3,
        totalReps: 30,
        totalVolume: 3000,
      },
    ],
    ...overrides,
  };
}

describe('HistorySessionDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the selected session details and progression recommendations', () => {
    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: false,
      sessions: [buildSession()],
      trendSeriesByMetric: {
        volume: [],
        hours: [],
        reps: [],
        sets: [],
      },
      refresh: jest.fn(),
    });

    render(
      <HistorySessionDetailScreen
        navigation={jest.fn() as never}
        route={{
          key: 'HistorySessionDetail-key',
          name: 'HistorySessionDetail',
          params: { sessionId: 'session-1' },
        }}
      />,
    );

    expect(screen.getAllByText('Upper A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
    expect(screen.getByText('Progression Next Time')).toBeTruthy();
  });

  it('uses the caller progression config for volume and recommendations', () => {
    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: false,
      sessions: [buildSession()],
      trendSeriesByMetric: {
        volume: [],
        hours: [],
        reps: [],
        sets: [],
      },
      refresh: jest.fn(),
    });

    render(
      <HistorySessionDetailScreen
        navigation={jest.fn() as never}
        progressionConfig={{
          unit: 'lb',
          weightIncrement: 2.5,
          precision: 1,
        }}
        route={{
          key: 'HistorySessionDetail-key',
          name: 'HistorySessionDetail',
          params: { sessionId: 'session-1' },
        }}
      />,
    );

    expect(screen.getAllByText('3,000 lb').length).toBeGreaterThan(0);
    expect(screen.getByText('+2.5 lb')).toBeTruthy();
  });

  it('shows a loading state before the history query resolves', () => {
    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: true,
      sessions: [],
      trendSeriesByMetric: {
        volume: [],
        hours: [],
        reps: [],
        sets: [],
      },
      refresh: jest.fn(),
    });

    render(
      <HistorySessionDetailScreen
        navigation={jest.fn() as never}
        route={{
          key: 'HistorySessionDetail-key',
          name: 'HistorySessionDetail',
          params: { sessionId: 'missing-session' },
        }}
      />,
    );

    expect(screen.getByText('Loading session')).toBeTruthy();
    expect(screen.queryByText('Session unavailable')).toBeNull();
  });

  it('shows fallback UI for an invalid session id', () => {
    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: false,
      sessions: [buildSession()],
      trendSeriesByMetric: {
        volume: [],
        hours: [],
        reps: [],
        sets: [],
      },
      refresh: jest.fn(),
    });

    render(
      <HistorySessionDetailScreen
        navigation={jest.fn() as never}
        route={{
          key: 'HistorySessionDetail-key',
          name: 'HistorySessionDetail',
          params: { sessionId: 'missing-session' },
        }}
      />,
    );

    expect(screen.getByText('Session unavailable')).toBeTruthy();
  });

  it('renders the route session while the query is still loading', () => {
    const session = buildSession();

    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: true,
      sessions: [],
      trendSeriesByMetric: {
        volume: [],
        hours: [],
        reps: [],
        sets: [],
      },
      refresh: jest.fn(),
    });

    render(
      <HistorySessionDetailScreen
        navigation={jest.fn() as never}
        route={{
          key: 'HistorySessionDetail-key',
          name: 'HistorySessionDetail',
          params: { sessionId: session.id, session },
        }}
      />,
    );

    expect(screen.getAllByText('Upper A').length).toBeGreaterThan(0);
    expect(screen.queryByText('Loading session')).toBeNull();
  });
});
