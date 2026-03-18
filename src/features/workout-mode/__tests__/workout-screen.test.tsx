import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ActionSheetIOS } from 'react-native';

import { WorkoutActiveScreen, WorkoutScreen } from '../screens/workout-screen';
import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { useActiveWorkout } from '../hooks/use-active-workout';
import { useExercises } from '@features/routines';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactNative = require('react-native');

  return {
    SafeAreaView: ({ children, ...props }: React.PropsWithChildren) => (
      <ReactNative.View {...props}>{children}</ReactNative.View>
    ),
    useSafeAreaInsets: () => ({
      top: 0,
      right: 0,
      bottom: 34,
      left: 0,
    }),
  };
});

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

jest.mock('@lodev09/react-native-true-sheet', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  return {
    TrueSheet: React.forwardRef(
      (
        { children }: React.PropsWithChildren,
        ref: React.ForwardedRef<{
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

const mockUseWorkoutStore = jest.mocked(useWorkoutStore);
const mockUseWorkoutStarter = jest.mocked(useWorkoutStarter);
const mockUseActiveWorkout = jest.mocked(useActiveWorkout);
const mockUseExercises = jest.mocked(useExercises);
const mockShowActionSheetWithOptions = jest.spyOn(
  ActionSheetIOS,
  'showActionSheetWithOptions',
);

type WorkoutTabScreenProps = React.ComponentProps<typeof WorkoutScreen>;
type WorkoutActiveScreenProps = React.ComponentProps<
  typeof WorkoutActiveScreen
>;
type WorkoutStoreState = ReturnType<typeof useWorkoutStore>;

function createWorkoutTabScreenProps(): WorkoutTabScreenProps {
  return {
    navigation: {
      navigate: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      dispatch: jest.fn(),
      getParent: jest.fn(),
      setOptions: jest.fn(),
      isFocused: jest.fn(() => true),
    },
    route: {
      key: 'Workout-key',
      name: 'Workout' as const,
    },
  } as unknown as WorkoutTabScreenProps;
}

function createWorkoutActiveScreenProps(): WorkoutActiveScreenProps {
  return {
    navigation: {
      navigate: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      dispatch: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      isFocused: jest.fn(() => true),
    },
    route: {
      key: 'ActiveWorkout-key',
      name: 'ActiveWorkout' as const,
      params: undefined,
    },
  } as unknown as WorkoutActiveScreenProps;
}

function mockWorkoutStoreState(state: WorkoutStoreState): void {
  mockUseWorkoutStore.mockImplementation(((
    selector?: (store: WorkoutStoreState) => unknown,
  ) => {
    if (typeof selector === 'function') {
      return selector(state);
    }

    return state;
  }) as typeof useWorkoutStore);
}

describe('WorkoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowActionSheetWithOptions.mockImplementation((_, callback) => {
      callback(0);
    });
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
      toggleSetLogged: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
    });
  });

  it('renders the next scheduled workout and starts either workout flow', () => {
    const props = createWorkoutTabScreenProps();
    const startWorkoutFromSchedule = jest.fn();
    const startFreeWorkout = jest.fn();
    const refreshPreview = jest.fn();

    mockWorkoutStoreState({
      isWorkoutActive: false,
      isWorkoutCollapsed: false,
      activeSession: null,
      startTime: null,
      restTimerEndsAt: null,
      collapseWorkout: jest.fn(),
      expandWorkout: jest.fn(),
      startRestTimer: jest.fn(),
      clearRestTimer: jest.fn(),
    } as ReturnType<typeof useWorkoutStore>);
    mockUseWorkoutStarter.mockReturnValue({
      nextRoutine: {
        routineId: 'routine-1',
        routineName: 'Push A',
        scheduleName: 'Upper Split',
        exerciseCount: 6,
        estimatedMinutes: 40,
      },
      startWorkoutFromSchedule,
      startFreeWorkout,
      refreshPreview,
    });

    render(<WorkoutScreen {...props} />);

    expect(refreshPreview).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Your next workout is ready, Push A.'),
    ).toBeTruthy();
    expect(screen.getByText('Push A')).toBeTruthy();
    expect(screen.getByText('6 exercises • ~40 mins')).toBeTruthy();

    fireEvent.press(screen.getByText('Start Push A'));
    fireEvent.press(screen.getByText('Start Free Workout'));

    expect(startWorkoutFromSchedule).toHaveBeenCalledTimes(1);
    expect(startFreeWorkout).toHaveBeenCalledTimes(1);
  });

  it('shows the current workout state on the home tab while a session is active', () => {
    const props = createWorkoutTabScreenProps();
    const expandWorkout = jest.fn();

    mockWorkoutStoreState({
      isWorkoutActive: true,
      isWorkoutCollapsed: true,
      activeSession: {
        id: 'session-1',
        title: 'Push A',
        startTime: 1_700_000_000_000,
        isFreeWorkout: false,
        exercises: [
          {
            exerciseId: 'exercise-1',
            exerciseName: 'Bench Press',
            sets: [],
            targetSets: 3,
            targetReps: 8,
          },
        ],
      },
      startTime: 1_700_000_000_000,
      restTimerEndsAt: null,
      collapseWorkout: jest.fn(),
      expandWorkout,
      startRestTimer: jest.fn(),
      clearRestTimer: jest.fn(),
    } as ReturnType<typeof useWorkoutStore>);
    mockUseWorkoutStarter.mockReturnValue({
      nextRoutine: {
        routineId: 'routine-2',
        routineName: 'Pull A',
        scheduleName: 'Upper Split',
        exerciseCount: 6,
        estimatedMinutes: 40,
      },
      startWorkoutFromSchedule: jest.fn(),
      startFreeWorkout: jest.fn(),
      refreshPreview: jest.fn(),
    });

    render(<WorkoutScreen {...props} />);

    expect(screen.getByText('Current Workout')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();
    expect(screen.queryByText('Start Push A')).toBeNull();
    expect(screen.queryByText('Start Free Workout')).toBeNull();

    fireEvent.press(screen.getByText('Continue'));

    expect(expandWorkout).toHaveBeenCalledTimes(1);
  });

  it('renders the active workout session and forwards set editing actions', () => {
    const props = createWorkoutActiveScreenProps();
    const addExercise = jest.fn();
    const removeExercise = jest.fn();
    const addSet = jest.fn();
    const deleteSet = jest.fn();
    const updateReps = jest.fn();
    const updateWeight = jest.fn();
    const toggleSetLogged = jest.fn();
    const completeWorkout = jest.fn().mockReturnValue(true);

    mockWorkoutStoreState({
      isWorkoutActive: true,
      isWorkoutCollapsed: false,
      activeSession: null,
      startTime: 1_700_000_000_000,
      restTimerEndsAt: null,
      collapseWorkout: jest.fn(),
      expandWorkout: jest.fn(),
      startRestTimer: jest.fn(),
      clearRestTimer: jest.fn(),
    } as ReturnType<typeof useWorkoutStore>);
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
      toggleSetLogged,
      completeWorkout,
    });

    render(<WorkoutActiveScreen {...props} />);

    expect(screen.getByText('Push A')).toBeTruthy();
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);

    const repsInput = screen.getByLabelText('Bench Press set 1 reps');
    const weightInput = screen.getByLabelText('Bench Press set 1 weight');

    fireEvent.changeText(repsInput, '10');
    fireEvent(repsInput, 'endEditing');
    fireEvent.changeText(weightInput, '140.5');
    fireEvent(weightInput, 'endEditing');
    fireEvent.press(screen.getByLabelText('Log Bench Press set 1'));
    fireEvent.press(screen.getByText('Add set'));
    fireEvent.press(screen.getByLabelText('Delete Bench Press set 1'));
    fireEvent.press(screen.getByLabelText('Options for Bench Press'));
    fireEvent.press(screen.getByText('Complete Workout'));

    expect(updateReps).toHaveBeenCalledWith('set-1', 10);
    expect(updateWeight).toHaveBeenCalledWith('set-1', 140.5);
    expect(toggleSetLogged).toHaveBeenCalledWith('set-1', true);
    expect(addSet).toHaveBeenCalledWith('exercise-1');
    expect(deleteSet).toHaveBeenCalledWith('set-1');
    expect(removeExercise).toHaveBeenCalledWith('exercise-1');
    expect(completeWorkout).toHaveBeenCalledTimes(1);
  });

  it('allows adding ad hoc exercises during a scheduled workout', () => {
    const props = createWorkoutActiveScreenProps();
    const addExercise = jest.fn();

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
    mockWorkoutStoreState({
      isWorkoutActive: true,
      isWorkoutCollapsed: false,
      activeSession: null,
      startTime: 1_700_000_000_000,
      restTimerEndsAt: null,
      collapseWorkout: jest.fn(),
      expandWorkout: jest.fn(),
      startRestTimer: jest.fn(),
      clearRestTimer: jest.fn(),
    } as ReturnType<typeof useWorkoutStore>);
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
      removeExercise: jest.fn(),
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      toggleSetLogged: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
    });

    render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByLabelText('Add exercise'));
    fireEvent.press(screen.getByLabelText('Add Goblet Squat'));

    expect(addExercise).toHaveBeenCalledWith('exercise-2', 'Goblet Squat');
  });

  it('allows adding and removing exercises during a free workout', () => {
    const props = createWorkoutActiveScreenProps();
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
    mockWorkoutStoreState({
      isWorkoutActive: true,
      isWorkoutCollapsed: false,
      activeSession: null,
      startTime: 1_700_000_000_000,
      restTimerEndsAt: null,
      collapseWorkout: jest.fn(),
      expandWorkout: jest.fn(),
      startRestTimer: jest.fn(),
      clearRestTimer: jest.fn(),
    } as ReturnType<typeof useWorkoutStore>);
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
      toggleSetLogged: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
    });

    const { rerender } = render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByLabelText('Add exercise'));
    fireEvent.press(screen.getByLabelText('Add Goblet Squat'));

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
      toggleSetLogged: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
    });

    rerender(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByLabelText('Options for Goblet Squat'));

    expect(removeExercise).toHaveBeenCalledWith('exercise-2');
  });
});
