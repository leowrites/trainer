import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { WorkoutScreen } from '../screens/workout-screen';
import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { useActiveWorkout } from '../hooks/use-active-workout';
import { useExercises } from '@features/routines';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../store', () => ({
  useWorkoutStore: jest.fn(),
}));

jest.mock('../hooks/use-workout-starter', () => ({
  useWorkoutStarter: jest.fn(),
}));

jest.mock('../hooks/use-active-workout', () => ({
  useActiveWorkout: jest.fn(),
}));

jest.mock('@features/routines', () => ({
  useExercises: jest.fn(),
}));

const mockUseWorkoutStore = jest.mocked(useWorkoutStore);
const mockUseWorkoutStarter = jest.mocked(useWorkoutStarter);
const mockUseActiveWorkout = jest.mocked(useActiveWorkout);
const mockUseExercises = jest.mocked(useExercises);

describe('WorkoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExercises.mockReturnValue({
      exercises: [],
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseActiveWorkout.mockReturnValue({
      activeSession: null,
      addExercise: jest.fn(),
      removeExercise: jest.fn(),
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
    });
  });

  it('renders the next scheduled workout and starts either workout flow', () => {
    const startWorkoutFromSchedule = jest.fn();
    const startFreeWorkout = jest.fn();
    const refreshPreview = jest.fn();

    mockUseWorkoutStore.mockReturnValue({
      isWorkoutActive: false,
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
  });

  it('renders the active workout session and forwards set editing actions', () => {
    const addExercise = jest.fn();
    const removeExercise = jest.fn();
    const addSet = jest.fn();
    const deleteSet = jest.fn();
    const updateReps = jest.fn();
    const updateWeight = jest.fn();
    const completeWorkout = jest.fn().mockReturnValue(true);

    mockUseWorkoutStore.mockReturnValue({
      isWorkoutActive: true,
    });
    mockUseWorkoutStarter.mockReturnValue({
      nextRoutine: null,
      startWorkoutFromSchedule: jest.fn(),
      startFreeWorkout: jest.fn(),
      refreshPreview: jest.fn(),
    });
    mockUseActiveWorkout.mockReturnValue({
      activeSession: {
        id: 'session-1',
        title: 'Push A',
        startTime: 1_700_000_000_000,
        isFreeWorkout: false,
        exercises: [
          {
            exerciseId: 'exercise-1',
            exerciseName: 'Bench Press',
            sets: [
              {
                id: 'set-1',
                exerciseId: 'exercise-1',
                reps: 8,
                weight: 135,
                isCompleted: false,
                targetSets: 3,
                targetReps: 8,
              },
            ],
            targetSets: 3,
            targetReps: 8,
          },
        ],
      },
      addExercise,
      removeExercise,
      addSet,
      deleteSet,
      updateReps,
      updateWeight,
      completeWorkout,
    });

    render(<WorkoutScreen />);

    expect(screen.getByText('Session in progress')).toBeTruthy();
    expect(screen.getByText('Bench Press')).toBeTruthy();

    const repsInput = screen.getByLabelText('Bench Press set 1 reps');
    const weightInput = screen.getByLabelText('Bench Press set 1 weight');

    fireEvent.changeText(repsInput, '10');
    fireEvent(repsInput, 'endEditing');
    fireEvent.changeText(weightInput, '140.5');
    fireEvent(weightInput, 'endEditing');
    fireEvent.press(screen.getByText('Add Set'));
    fireEvent.press(screen.getByLabelText('Delete Bench Press set 1'));
    fireEvent.press(screen.getByText('Complete Workout'));

    expect(updateReps).toHaveBeenCalledWith('set-1', 10);
    expect(updateWeight).toHaveBeenCalledWith('set-1', 140.5);
    expect(addSet).toHaveBeenCalledWith('exercise-1');
    expect(deleteSet).toHaveBeenCalledWith('set-1');
    expect(completeWorkout).toHaveBeenCalledTimes(1);
  });

  it('allows adding and removing exercises during a free workout', () => {
    const addExercise = jest.fn();
    const removeExercise = jest.fn();

    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'Chest',
        },
        {
          id: 'exercise-2',
          name: 'Goblet Squat',
          muscle_group: 'Legs',
        },
      ],
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseWorkoutStore.mockReturnValue({
      isWorkoutActive: true,
    });
    mockUseWorkoutStarter.mockReturnValue({
      nextRoutine: null,
      startWorkoutFromSchedule: jest.fn(),
      startFreeWorkout: jest.fn(),
      refreshPreview: jest.fn(),
    });
    mockUseActiveWorkout.mockReturnValue({
      activeSession: {
        id: 'session-2',
        title: 'Free Workout',
        startTime: 1_700_000_000_000,
        isFreeWorkout: true,
        exercises: [],
      },
      addExercise,
      removeExercise,
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
    });

    const { rerender } = render(<WorkoutScreen />);

    fireEvent.press(screen.getByText('Add Exercise'));
    fireEvent.press(screen.getByLabelText('Goblet Squat'));

    expect(addExercise).toHaveBeenCalledWith('exercise-2', 'Goblet Squat');

    mockUseActiveWorkout.mockReturnValue({
      activeSession: {
        id: 'session-2',
        title: 'Free Workout',
        startTime: 1_700_000_000_000,
        isFreeWorkout: true,
        exercises: [
          {
            exerciseId: 'exercise-2',
            exerciseName: 'Goblet Squat',
            sets: [
              {
                id: 'set-1',
                exerciseId: 'exercise-2',
                reps: 0,
                weight: 0,
                isCompleted: false,
                targetSets: null,
                targetReps: null,
              },
            ],
            targetSets: null,
            targetReps: null,
          },
        ],
      },
      addExercise,
      removeExercise,
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
    });

    rerender(<WorkoutScreen />);

    fireEvent.press(screen.getByText('Remove Exercise'));

    expect(removeExercise).toHaveBeenCalledWith('exercise-2');
  });
});
