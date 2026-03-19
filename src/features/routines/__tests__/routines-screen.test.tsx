import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { RoutinesScreen } from '../screens/routines-screen';
import { useExercises } from '../hooks/use-exercises';
import { useRoutines } from '../hooks/use-routines';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../hooks/use-exercises', () => ({
  useExercises: jest.fn(),
}));

jest.mock('../hooks/use-routines', () => ({
  useRoutines: jest.fn(),
}));

const mockUseExercises = jest.mocked(useExercises);
const mockUseRoutines = jest.mocked(useRoutines);

describe('RoutinesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new exercise from the exercises section', () => {
    const refreshExercises = jest.fn();
    const refreshRoutines = jest.fn();
    const createExercise = jest.fn();

    mockUseExercises.mockReturnValue({
      exercises: [],
      refresh: refreshExercises,
      createExercise,
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue({
      routines: [],
      refresh: refreshRoutines,
      createRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn().mockReturnValue([]),
    });

    render(<RoutinesScreen />);

    expect(refreshExercises).toHaveBeenCalledTimes(1);
    expect(refreshRoutines).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('+ New Exercise'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Exercise name'),
      ' Bench Press ',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText('Muscle group (e.g. Chest)'),
      ' Chest ',
    );
    fireEvent.press(screen.getByText('Save exercise'));

    expect(createExercise).toHaveBeenCalledWith({
      name: 'Bench Press',
      muscleGroup: 'Chest',
    });
  });

  it('renders the routines section and expands routine details', () => {
    mockUseExercises.mockReturnValue({
      exercises: [
        { id: 'exercise-1', name: 'Bench Press', muscle_group: 'Chest' },
      ],
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue({
      routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      refresh: jest.fn(),
      createRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn().mockReturnValue([
        {
          id: 'routine-exercise-1',
          routine_id: 'routine-1',
          exercise_id: 'exercise-1',
          position: 1,
          target_sets: 3,
          target_reps: 10,
        },
      ]),
    });

    render(<RoutinesScreen />);

    fireEvent.press(screen.getByLabelText('routines'));
    fireEvent.press(screen.getByLabelText('Expand Push A'));

    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
    expect(screen.getByText('3 × 10')).toBeTruthy();
  });
});
