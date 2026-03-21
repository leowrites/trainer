import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList } from 'react-native';

import type { HistoryStackParamList } from '../navigation-types';
import { HistoryScreen } from '../screens/history-screen';
import { useHistoryAnalytics } from '../hooks/use-history-analytics';
import type { HistorySession, TrendPoint } from '../types';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => false,
}));

jest.mock('react-native-gifted-charts', () => {
  const ReactNative = require('react-native');

  return {
    LineChart: ({ data }: { data: Array<unknown> }) => (
      <ReactNative.Text>LineChart {data.length}</ReactNative.Text>
    ),
  };
});

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

function buildTrendPoint(overrides: Partial<TrendPoint> = {}): TrendPoint {
  return {
    key: '2026-03-10',
    label: 'Mar 10',
    value: 3000,
    sessionCount: 1,
    startTime: new Date('2026-03-10T15:00:00.000Z').getTime(),
    ...overrides,
  };
}

function buildTrendSeries(): {
  volume: TrendPoint[];
  hours: TrendPoint[];
  reps: TrendPoint[];
  sets: TrendPoint[];
} {
  return {
    volume: [buildTrendPoint()],
    hours: [buildTrendPoint({ key: '2026-03-10-hours', value: 1.2 })],
    reps: [buildTrendPoint({ key: '2026-03-10-reps', value: 30 })],
    sets: [buildTrendPoint({ key: '2026-03-10-sets', value: 3 })],
  };
}

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty analytics and history states without the latest session card', () => {
    const refresh = jest.fn();
    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      allSessions: [],
      sessions: [],
      trendSeriesByMetric: {
        volume: [],
        hours: [],
        reps: [],
        sets: [],
      },
      loadMore: jest.fn(),
      refresh,
    });

    render(<HistoryScreen />);

    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.queryByText('Latest Session')).toBeNull();
    expect(screen.getByText('No workout history yet')).toBeTruthy();
    expect(screen.getByText('No data yet')).toBeTruthy();
  });

  it('toggles chart metrics and navigates to session detail from a card press', () => {
    const refresh = jest.fn();
    const navigation = {
      navigate: jest.fn(),
    } as unknown as NativeStackNavigationProp<
      HistoryStackParamList,
      'HistoryOverview'
    >;

    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      allSessions: [
        buildSession(),
        buildSession({
          id: 'session-2',
          routineName: 'Lower A',
          totalSets: 4,
          totalCompletedSets: 4,
          totalReps: 20,
          durationMinutes: 45,
          totalVolume: 2200,
          exerciseCount: 2,
        }),
      ],
      sessions: [
        buildSession(),
        buildSession({
          id: 'session-2',
          routineName: 'Lower A',
          totalSets: 4,
          totalCompletedSets: 4,
          totalReps: 20,
          durationMinutes: 45,
          totalVolume: 2200,
          exerciseCount: 2,
        }),
      ],
      trendSeriesByMetric: buildTrendSeries(),
      loadMore: jest.fn(),
      refresh,
    });

    render(<HistoryScreen navigation={navigation} />);

    expect(screen.getAllByText('3,000 kg').length).toBeGreaterThan(0);
    expect(screen.getByText('LineChart 1')).toBeTruthy();
    expect(screen.getByText('3 sets')).toBeTruthy();
    expect(screen.queryByText('Latest Session')).toBeNull();

    fireEvent.press(screen.getByLabelText('Show Hours'));

    expect(screen.getByText('1.2 hr')).toBeTruthy();
    expect(
      screen.getByText('Workout hours over time • Last 3 months'),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Show Last Year'));

    expect(
      screen.getByText('Workout hours over time • Last year'),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Open Lower A'));

    expect(navigation.navigate).toHaveBeenCalledWith(
      'HistorySessionDetail',
      expect.objectContaining({
        sessionId: 'session-2',
      }),
    );
  });

  it('requests the next page when the list reaches the end', () => {
    const loadMore = jest.fn();

    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      allSessions: [buildSession()],
      sessions: [buildSession()],
      trendSeriesByMetric: buildTrendSeries(),
      loadMore,
      refresh: jest.fn(),
    });

    const view = render(<HistoryScreen />);

    view.UNSAFE_getByType(FlatList).props.onEndReached();

    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
