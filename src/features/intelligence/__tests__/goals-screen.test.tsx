import { render } from '@testing-library/react-native';
import React from 'react';

import type { GoalsScreenProps } from '../screens/goals-screen';
import { GoalsScreen } from '../screens/goals-screen';
import { useHistoryAnalytics } from '@features/analytics';
import { useTrainingGoals } from '../hooks/use-training-goals';
import { useExercises } from '@features/routines';

jest.mock('@features/analytics', () => ({
  useHistoryAnalytics: jest.fn(),
}));

jest.mock('@features/routines', () => ({
  useExercises: jest.fn(),
}));

jest.mock('../hooks/use-training-goals', () => ({
  useTrainingGoals: jest.fn(),
}));

jest.mock('@shared/components', () => ({
  Body: ({ children }: { children: React.ReactNode }) => children,
  Button: ({ children }: { children: React.ReactNode }) => children,
  Card: ({ children }: { children: React.ReactNode }) => children,
  Container: ({ children }: { children: React.ReactNode }) => children,
  Heading: ({ children }: { children: React.ReactNode }) => children,
  Input: () => null,
  Label: ({ children }: { children: React.ReactNode }) => children,
  Muted: ({ children }: { children: React.ReactNode }) => children,
}));

const mockUseHistoryAnalytics = jest.mocked(useHistoryAnalytics);
const mockUseTrainingGoals = jest.mocked(useTrainingGoals);
const mockUseExercises = jest.mocked(useExercises);

describe('GoalsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes history sessions into the goals hook', () => {
    mockUseHistoryAnalytics.mockReturnValue({
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      allSessions: [
        {
          id: 'session-1',
          routineId: 'routine-1',
          routineName: 'Upper A',
          startTime: 1_700_000_000_000,
          endTime: 1_700_000_060_000,
          durationMinutes: 60,
          totalSets: 1,
          totalCompletedSets: 1,
          totalReps: 8,
          totalVolume: 800,
          exerciseCount: 1,
          exercises: [],
        },
      ],
      sessions: [],
      trendSeriesByMetric: {
        volume: [],
        hours: [],
        reps: [],
        sets: [],
      },
      loadMore: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseExercises.mockReturnValue({
      exercises: [],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseTrainingGoals.mockReturnValue({
      goals: [],
      goalViewModels: [],
      createGoal: jest.fn(),
      updateGoal: jest.fn(),
      deleteGoal: jest.fn(),
      refresh: jest.fn(),
    });

    render(<GoalsScreen {...({} as GoalsScreenProps)} />);

    expect(mockUseTrainingGoals).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'session-1' })]),
    );
  });
});
