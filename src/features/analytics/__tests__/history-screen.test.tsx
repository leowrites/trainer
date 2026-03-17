import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { HistoryScreen } from '../screens/history-screen';
import { useHistoryAnalytics } from '../hooks/use-history-analytics';
import type { HistorySession, TrendPoint } from '../types';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

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

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty analytics and history states', () => {
    const refresh = jest.fn();
    mockUseHistoryAnalytics.mockReturnValue({
      sessions: [],
      volumeTrend: [],
      hoursTrend: [],
      refresh,
    });

    render(<HistoryScreen />);

    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByText('No sessions recorded yet.')).toBeTruthy();
    expect(screen.getByText('No workout history yet')).toBeTruthy();
    expect(
      screen.getByText(
        'Complete a workout to start tracking volume over time.',
      ),
    ).toBeTruthy();
  });

  it('renders session detail, analytics cards, and progression recommendations', () => {
    const refresh = jest.fn();
    mockUseHistoryAnalytics.mockReturnValue({
      sessions: [
        buildSession(),
        buildSession({
          id: 'session-2',
          routineName: 'Lower A',
          startTime: new Date('2026-03-08T15:00:00.000Z').getTime(),
          endTime: new Date('2026-03-08T15:45:00.000Z').getTime(),
          durationMinutes: 45,
          totalVolume: 2200,
          exercises: [
            {
              exerciseId: 'exercise-2',
              exerciseName: 'Squat',
              targetSets: 3,
              targetReps: 5,
              sets: [
                {
                  id: 'set-4',
                  exerciseId: 'exercise-2',
                  reps: 5,
                  weight: 120,
                  isCompleted: true,
                },
                {
                  id: 'set-5',
                  exerciseId: 'exercise-2',
                  reps: 5,
                  weight: 120,
                  isCompleted: true,
                },
                {
                  id: 'set-6',
                  exerciseId: 'exercise-2',
                  reps: 5,
                  weight: 120,
                  isCompleted: true,
                },
              ],
              totalSets: 3,
              completedSets: 3,
              totalReps: 15,
              totalVolume: 1800,
            },
          ],
        }),
      ],
      volumeTrend: [buildTrendPoint()],
      hoursTrend: [buildTrendPoint({ key: '2026-03-10-hours', value: 1.2 })],
      refresh,
    });

    render(
      <HistoryScreen
        progressionConfig={{ weightIncrement: 2.5, unit: 'kg', precision: 1 }}
      />,
    );

    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText('Volume Over Time')).toBeTruthy();
    expect(screen.getByText('Hours Over Time')).toBeTruthy();
    expect(screen.getAllByText('Upper A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
    expect(screen.getByText('Progression Next Time')).toBeTruthy();
    expect(screen.getByText('+2.5 kg')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Expand Lower A'));

    expect(screen.getAllByText('Squat').length).toBeGreaterThan(0);
  });
});
