import { fireEvent, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import React, { type ForwardedRef, type PropsWithChildren } from 'react';

import { RoutineDetailScreen } from '../screens/routine-detail-screen';
import { RoutinesScreen } from '../screens/routines-screen';
import { useExercises } from '../hooks/use-exercises';
import { useRoutineInsights } from '../hooks/use-routine-insights';
import { useRoutines } from '../hooks/use-routines';

void React;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');

  return {
    ...actual,
    useFocusEffect: (callback: () => void) => callback(),
  };
});

jest.mock('@react-navigation/elements', () => {
  const actual = jest.requireActual('@react-navigation/elements');

  return {
    ...actual,
    useHeaderHeight: () => 96,
  };
});

jest.mock('../hooks/use-exercises', () => ({
  useExercises: jest.fn(),
}));

jest.mock('../hooks/use-routine-insights', () => ({
  useRoutineInsights: jest.fn(),
}));

jest.mock('../hooks/use-routines', () => ({
  useRoutines: jest.fn(),
}));

jest.mock('@lodev09/react-native-true-sheet', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  return {
    TrueSheet: React.forwardRef(
      (
        { children }: PropsWithChildren,
        ref: ForwardedRef<{
          present: () => Promise<void>;
          dismiss: () => Promise<void>;
        }>,
      ) => {
        React.useImperativeHandle(ref, () => ({
          present: async () => undefined,
          dismiss: async () => undefined,
        }));

        return <ReactNative.View>{children}</ReactNative.View>;
      },
    ),
  };
});

const mockUseExercises = jest.mocked(useExercises);
const mockUseRoutineInsights = jest.mocked(useRoutineInsights);
const mockUseRoutines = jest.mocked(useRoutines);

function renderScreen(): ReturnType<typeof render> {
  return render(
    <NavigationContainer>
      <RoutinesScreen />
    </NavigationContainer>,
  );
}

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
      is_deleted: 0,
    });

    mockUseExercises.mockReturnValue({
      exercises: [],
      hasLoaded: true,
      refresh: refreshExercises,
      createExercise,
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue({
      routines: [],
      hasLoaded: true,
      refresh: refreshRoutines,
      createRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn().mockReturnValue([]),
      getRoutineExerciseCounts: jest.fn().mockReturnValue({}),
    });

    renderScreen();

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
          is_deleted: 0,
        },
      ],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseRoutines.mockReturnValue({
      routines: [],
      hasLoaded: true,
      refresh: jest.fn(),
      createRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn().mockReturnValue([]),
      getRoutineExerciseCounts: jest.fn().mockReturnValue({}),
    });

    renderScreen();

    fireEvent.press(screen.getByLabelText('Open Bench Press'));

    expect(screen.getByText('Edit Exercise')).toBeTruthy();
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
          is_deleted: 0,
        },
        {
          id: 'exercise-2',
          name: 'Overhead Press',
          muscle_group: 'Shoulders',
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
    mockUseRoutines.mockReturnValue({
      routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      hasLoaded: true,
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
      getRoutineExerciseCounts: jest.fn().mockReturnValue({
        'routine-1': 2,
      }),
    });

    renderScreen();

    fireEvent.press(screen.getByLabelText('routines'));
    fireEvent.press(screen.getByLabelText('Open Push A'));
    expect(screen.getByText('Edit Routine')).toBeTruthy();
    fireEvent.press(screen.getByText('Edit Routine'));
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

  it('waits for routines to load before leaving routine detail', () => {
    const goBack = jest.fn();
    const setOptions = jest.fn();

    mockUseExercises.mockReturnValue({
      exercises: [],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });

    mockUseRoutines.mockReturnValue({
      routines: [],
      hasLoaded: false,
      refresh: jest.fn(),
      createRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn().mockReturnValue([]),
      getRoutineExerciseCounts: jest.fn().mockReturnValue({}),
    });

    const view = render(
      <NavigationContainer>
        <RoutineDetailScreen
          route={{
            key: 'routine-detail',
            name: 'RoutineDetail',
            params: { routineId: 'routine-1' },
          }}
          navigation={{ goBack, setOptions } as never}
        />
      </NavigationContainer>,
    );

    expect(goBack).not.toHaveBeenCalled();

    mockUseRoutines.mockReturnValue({
      routines: [{ id: 'routine-1', name: 'Push A', notes: null }],
      hasLoaded: true,
      refresh: jest.fn(),
      createRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getRoutineExercises: jest.fn().mockReturnValue([]),
      getRoutineExerciseCounts: jest.fn().mockReturnValue({
        'routine-1': 0,
      }),
    });

    view.rerender(
      <NavigationContainer>
        <RoutineDetailScreen
          route={{
            key: 'routine-detail',
            name: 'RoutineDetail',
            params: { routineId: 'routine-1' },
          }}
          navigation={{ goBack, setOptions } as never}
        />
      </NavigationContainer>,
    );

    expect(goBack).not.toHaveBeenCalled();
    expect(screen.getByText('Edit Routine')).toBeTruthy();
    expect(setOptions).toHaveBeenCalledWith({ title: 'Push A' });
  });
});
