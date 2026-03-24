import { fireEvent, render, screen } from '@testing-library/react-native';
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
  Body: ({ children }: { children: React.ReactNode }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{children}</ReactNative.Text>;
  },
  Button: ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.Pressable onPress={onPress}>
        <ReactNative.Text>{children}</ReactNative.Text>
      </ReactNative.Pressable>
    );
  },
  Card: ({ children }: { children: React.ReactNode }) => {
    const ReactNative = require('react-native');
    return <ReactNative.View>{children}</ReactNative.View>;
  },
  Container: ({ children }: { children: React.ReactNode }) =>
    (() => {
      const ReactNative = require('react-native');
      return <ReactNative.View>{children}</ReactNative.View>;
    })(),
  Heading: ({ children }: { children: React.ReactNode }) =>
    (() => {
      const ReactNative = require('react-native');
      return <ReactNative.Text>{children}</ReactNative.Text>;
    })(),
  Input: ({
    value,
    onChangeText,
    placeholder,
  }: {
    value?: string;
    onChangeText?: (value: string) => void;
    placeholder?: string;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
    );
  },
  InteractivePressable: ({
    children,
    onPress,
    accessibilityLabel,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) => {
    const ReactNative = require('react-native');
    return (
      <ReactNative.Pressable
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
      >
        <ReactNative.Text>{children}</ReactNative.Text>
      </ReactNative.Pressable>
    );
  },
  Label: ({ children }: { children: React.ReactNode }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{children}</ReactNative.Text>;
  },
  Muted: ({ children }: { children: React.ReactNode }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>{children}</ReactNative.Text>;
  },
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

  it('submits the exact selected exercise id for strength goals', () => {
    const createGoal = jest.fn();

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
      refresh: jest.fn(),
    });
    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'chest',
          how_to: null,
          equipment: null,
          is_deleted: 0,
        },
      ],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseTrainingGoals.mockReturnValue({
      goals: [],
      goalViewModels: [],
      createGoal,
      updateGoal: jest.fn(),
      deleteGoal: jest.fn(),
      refresh: jest.fn(),
    });

    render(<GoalsScreen {...({} as GoalsScreenProps)} />);

    fireEvent.press(screen.getByText('Select exercise'));
    fireEvent.press(screen.getByLabelText('Choose Bench Press'));
    fireEvent.changeText(screen.getByPlaceholderText('100'), '225');
    fireEvent.changeText(screen.getByPlaceholderText('5'), '5');
    fireEvent.press(screen.getByText('Create Goal'));

    expect(createGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        goalType: 'strength',
        exerciseId: 'exercise-1',
        targetLoad: 225,
        targetReps: 5,
      }),
    );
  });
});
