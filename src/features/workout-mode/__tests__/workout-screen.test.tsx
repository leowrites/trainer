import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { WorkoutScreen } from '../screens/workout-screen';
import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../store', () => ({
  useWorkoutStore: jest.fn(),
}));

jest.mock('../hooks/use-workout-starter', () => ({
  useWorkoutStarter: jest.fn(),
}));

const mockUseWorkoutStore = jest.mocked(useWorkoutStore);
const mockUseWorkoutStarter = jest.mocked(useWorkoutStarter);

describe('WorkoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the next scheduled workout and starts either workout flow', () => {
    const endWorkout = jest.fn();
    const startWorkoutFromSchedule = jest.fn();
    const startFreeWorkout = jest.fn();
    const refreshPreview = jest.fn();

    mockUseWorkoutStore.mockReturnValue({
      isWorkoutActive: false,
      endWorkout,
    });
    mockUseWorkoutStarter.mockReturnValue({
      nextRoutine: {
        routineId: 'routine-1',
        routineName: 'Push A',
        scheduleName: 'Upper Split',
      },
      startWorkoutFromSchedule,
      startFreeWorkout,
      refreshPreview,
    });

    render(<WorkoutScreen />);

    expect(refreshPreview).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Up next · Upper Split')).toBeTruthy();
    expect(screen.getByText('Push A')).toBeTruthy();

    fireEvent.press(screen.getByText('Start Push A'));
    fireEvent.press(screen.getByText('Free Workout'));

    expect(startWorkoutFromSchedule).toHaveBeenCalledTimes(1);
    expect(startFreeWorkout).toHaveBeenCalledTimes(1);
    expect(endWorkout).not.toHaveBeenCalled();
  });

  it('renders the active workout state and ends the session', () => {
    const endWorkout = jest.fn();

    mockUseWorkoutStore.mockReturnValue({
      isWorkoutActive: true,
      endWorkout,
    });
    mockUseWorkoutStarter.mockReturnValue({
      nextRoutine: null,
      startWorkoutFromSchedule: jest.fn(),
      startFreeWorkout: jest.fn(),
      refreshPreview: jest.fn(),
    });

    render(<WorkoutScreen />);

    expect(screen.getByText('Session in progress')).toBeTruthy();

    fireEvent.press(screen.getByText('End Workout'));

    expect(endWorkout).toHaveBeenCalledTimes(1);
  });
});
