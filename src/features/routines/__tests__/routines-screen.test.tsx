import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { RoutinesScreen } from '../screens/routines-screen';
import { useExercises } from '../hooks/use-exercises';
import { useRoutineInsights } from '../hooks/use-routine-insights';
import { useRoutines } from '../hooks/use-routines';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('../hooks/use-exercises', () => ({
  useExercises: jest.fn(),
}));

jest.mock('../hooks/use-routine-insights', () => ({
  useRoutineInsights: jest.fn(),
}));

jest.mock('../hooks/use-routines', () => ({
  useRoutines: jest.fn(),
}));

const mockUseExercises = jest.mocked(useExercises);
const mockUseRoutineInsights = jest.mocked(useRoutineInsights);
const mockUseRoutines = jest.mocked(useRoutines);

describe('RoutinesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRoutineInsights.mockReturnValue({
      getExerciseInsight: jest.fn().mockReturnValue({
        totalSessions: 2,
        lastPerformedAt: new Date('2026-03-10T12:00:00.000Z').getTime(),
        bestCompletedWeight: 185,
        history: [
          {
            sessionId: 'session-1',
            sessionName: 'Push A',
            startTime: new Date('2026-03-10T12:00:00.000Z').getTime(),
            bestCompletedWeight: 185,
            completedSets: 3,
            totalSets: 3,
            setSummary: '8 × 185 • 8 × 185 • 7 × 185',
          },
        ],
      }),
      getRoutineInsight: jest.fn().mockReturnValue({
        completionCount: 4,
        lastPerformedAt: new Date('2026-03-12T12:00:00.000Z').getTime(),
        averageVolume: 5480,
        averageDurationMinutes: 52,
        recentSessions: [
          {
            sessionId: 'session-1',
            routineName: 'Push A',
            startTime: new Date('2026-03-12T12:00:00.000Z').getTime(),
            endTime: new Date('2026-03-12T12:52:00.000Z').getTime(),
            totalVolume: 5600,
            completedSets: 12,
            totalSets: 12,
          },
        ],
      }),
    });
  });

  it('creates a new exercise from the top-level create flow', () => {
    const refreshExercises = jest.fn();
    const refreshRoutines = jest.fn();
    const createExercise = jest.fn().mockReturnValue({
      id: 'exercise-created',
      name: 'Bench Press',
      muscle_group: 'Chest',
      how_to: 'Set your shoulders before every rep.',
      equipment: 'Barbell',
    });

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

    fireEvent.press(screen.getByText('New Exercise'));
    fireEvent.changeText(
      screen.getByPlaceholderText('Bench Press'),
      ' Bench Press ',
    );
    fireEvent.changeText(screen.getByPlaceholderText('Chest'), ' Chest ');
    fireEvent.changeText(
      screen.getByPlaceholderText('Barbell, bench'),
      ' Barbell ',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'Short setup cues, execution notes, and safety reminders',
      ),
      ' Set your shoulders before every rep. ',
    );
    fireEvent.press(screen.getAllByText('Create Exercise')[1]);

    expect(createExercise).toHaveBeenCalledWith({
      name: 'Bench Press',
      muscleGroup: 'Chest',
      howTo: ' Set your shoulders before every rep. ',
      equipment: ' Barbell ',
    });
  });

  it('opens the exercise detail page with how-to and history', () => {
    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'Chest',
          how_to: 'Drive your feet and keep the bar path stacked.',
          equipment: 'Barbell',
        },
      ],
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue({
      routines: [],
      refresh: jest.fn(),
      createRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn().mockReturnValue([]),
    });

    render(<RoutinesScreen />);

    fireEvent.press(screen.getByLabelText('Open Bench Press'));

    expect(screen.getByText('How To')).toBeTruthy();
    expect(
      screen.getByText('Drive your feet and keep the bar path stacked.'),
    ).toBeTruthy();
    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByText('8 × 185 • 8 × 185 • 7 × 185')).toBeTruthy();
  });

  it('opens the routine detail page and saves reordered exercises', () => {
    const updateRoutine = jest.fn();

    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'exercise-1',
          name: 'Bench Press',
          muscle_group: 'Chest',
          how_to: null,
          equipment: null,
        },
        {
          id: 'exercise-2',
          name: 'Overhead Press',
          muscle_group: 'Shoulders',
          how_to: null,
          equipment: null,
        },
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
      updateRoutine,
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn().mockReturnValue([
        {
          id: 'routine-exercise-1',
          routine_id: 'routine-1',
          exercise_id: 'exercise-1',
          position: 0,
          target_sets: 3,
          target_reps: 10,
        },
        {
          id: 'routine-exercise-2',
          routine_id: 'routine-1',
          exercise_id: 'exercise-2',
          position: 1,
          target_sets: 4,
          target_reps: 8,
        },
      ]),
    });

    render(<RoutinesScreen />);

    fireEvent.press(screen.getByLabelText('routines'));
    fireEvent.press(screen.getByLabelText('Open Push A'));
    fireEvent.press(screen.getByLabelText('Move Overhead Press up'));
    fireEvent.press(screen.getByText('Save Routine'));

    expect(screen.getByText('Progression')).toBeTruthy();
    expect(updateRoutine).toHaveBeenCalledWith('routine-1', {
      name: 'Push A',
      exercises: [
        {
          exerciseId: 'exercise-2',
          targetSets: 4,
          targetReps: 8,
        },
        {
          exerciseId: 'exercise-1',
          targetSets: 3,
          targetReps: 10,
        },
      ],
    });
  });
});
