import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { ActionSheetIOS, Alert } from 'react-native';

import { useHistoryAnalytics } from '@features/analytics';
import { useUserProfile } from '@features/health-tracking';
import { WorkoutActiveScreen, WorkoutScreen } from '../screens/workout-screen';
import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { useActiveWorkout } from '../hooks/use-active-workout';
import { usePreviousExercisePerformance } from '../hooks/use-previous-exercise-performance';
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

jest.mock('../hooks/use-previous-exercise-performance', () => ({
  usePreviousExercisePerformance: jest.fn(),
}));

jest.mock('@features/routines', () => ({
  useExercises: jest.fn(),
}));

jest.mock('@features/analytics', () => ({
  useHistoryAnalytics: jest.fn(),
  buildDashboardMetrics: jest.requireActual('@features/analytics')
    .buildDashboardMetrics,
}));

jest.mock('@features/health-tracking', () => ({
  useUserProfile: jest.fn(),
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
const mockUsePreviousExercisePerformance = jest.mocked(
  usePreviousExercisePerformance,
);
const mockUseExercises = jest.mocked(useExercises);
const mockUseHistoryAnalytics = jest.mocked(useHistoryAnalytics);
const mockUseUserProfile = jest.mocked(useUserProfile);
const mockShowActionSheetWithOptions = jest.spyOn(
  ActionSheetIOS,
  'showActionSheetWithOptions',
);

type WorkoutTabScreenProps = React.ComponentProps<typeof WorkoutScreen>;
type WorkoutActiveScreenProps = React.ComponentProps<
  typeof WorkoutActiveScreen
>;
type WorkoutStoreState = ReturnType<typeof useWorkoutStore.getState>;

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

function mockWorkoutStoreState(state: Partial<WorkoutStoreState>): void {
  const mergedState = Object.assign(
    {},
    {
      exerciseTimerEndsAtByExerciseId: {},
      exerciseTimerDurationByExerciseId: {},
      startExerciseTimer: jest.fn(),
      clearExerciseTimer: jest.fn(),
      setExerciseTimerDuration: jest.fn(),
      ...state,
    },
  ) as WorkoutStoreState;

  mockUseWorkoutStore.mockImplementation(((
    selector?: (store: WorkoutStoreState) => unknown,
  ) => {
    if (typeof selector === 'function') {
      return selector(mergedState);
    }

    return mergedState;
  }) as typeof useWorkoutStore);
}

function getLatestHeaderOptions(
  props: WorkoutActiveScreenProps,
): Record<string, unknown> {
  const setOptions = props.navigation.setOptions as jest.Mock;
  const latestCall = setOptions.mock.calls.at(-1);

  if (!latestCall) {
    throw new Error('Expected navigation.setOptions to be called');
  }

  return latestCall[0] as Record<string, unknown>;
}

describe('WorkoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 18, 8, 1, 30));
    mockShowActionSheetWithOptions.mockImplementation((_, callback) => {
      callback(0);
    });
    mockUseExercises.mockReturnValue({
      exercises: [],
      hasLoaded: true,
      refresh: jest.fn(),
      createExercise: jest.fn(),
      updateExercise: jest.fn(),
      deleteExercise: jest.fn(),
    });
    mockUseHistoryAnalytics.mockReturnValue({
      sessions: [
        {
          id: 'completed-session-1',
          routineId: 'routine-0',
          routineName: 'Pull A',
          startTime: new Date('2026-03-17T11:00:00.000Z').getTime(),
          endTime: new Date('2026-03-17T11:48:00.000Z').getTime(),
          durationMinutes: 48,
          totalSets: 12,
          totalCompletedSets: 12,
          totalVolume: 5240,
          exerciseCount: 5,
          exercises: [],
        },
      ],
      volumeTrend: [],
      hoursTrend: [],
      refresh: jest.fn(),
    });
    mockUseUserProfile.mockReturnValue({
      profile: {
        id: 'profile-1',
        displayName: 'Alex',
        preferredWeightUnit: 'kg',
        createdAt: 1,
        updatedAt: 1,
      },
      error: null,
      refresh: jest.fn(),
      saveProfile: jest.fn(),
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
      deleteWorkout: jest.fn().mockReturnValue(true),
    });
    mockUsePreviousExercisePerformance.mockReturnValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
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
    });
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

    expect(refreshPreview).not.toHaveBeenCalled();
    expect(screen.getByText('Good morning, Alex')).toBeTruthy();
    expect(screen.getByText('Workouts This Week')).toBeTruthy();
    expect(screen.getByText('Weekly Streak')).toBeTruthy();
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
    });
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
    expect(screen.queryByText('Start Pull A')).toBeNull();
    expect(screen.queryByText('Start Free Workout')).toBeNull();

    fireEvent.press(screen.getByText('Continue'));

    expect(expandWorkout).toHaveBeenCalledTimes(1);
  });

  it('renders the active workout session and forwards set editing actions', () => {
    const props = createWorkoutActiveScreenProps();
    const navigate = props.navigation.navigate as jest.Mock;
    const addExercise = jest.fn();
    const removeExercise = jest.fn();
    const addSet = jest.fn();
    const deleteSet = jest.fn();
    const updateReps = jest.fn();
    const updateWeight = jest.fn();
    const toggleSetLogged = jest.fn();
    const completeWorkout = jest.fn().mockReturnValue(true);
    const deleteWorkout = jest.fn().mockReturnValue(true);
    const startExerciseTimer = jest.fn();
    const setExerciseTimerDuration = jest.fn();

    mockWorkoutStoreState({
      isWorkoutActive: true,
      isWorkoutCollapsed: false,
      activeSession: null,
      startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
      restTimerEndsAt: null,
      exerciseTimerEndsAtByExerciseId: {
        'exercise-1': null,
      },
      exerciseTimerDurationByExerciseId: {
        'exercise-1': 60,
      },
      collapseWorkout: jest.fn(),
      expandWorkout: jest.fn(),
      startRestTimer: jest.fn(),
      clearRestTimer: jest.fn(),
      startExerciseTimer,
      clearExerciseTimer: jest.fn(),
      setExerciseTimerDuration,
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
        startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
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
      deleteWorkout,
    });
    mockUsePreviousExercisePerformance.mockReturnValue({
      'exercise-1': {
        reps: 8,
        weight: 130,
        completedAt: new Date(2026, 2, 16, 9, 0, 0).getTime(),
      },
    });
    mockShowActionSheetWithOptions.mockImplementation((options, callback) => {
      if (options.title === 'Bench Press timer') {
        callback(2);
        return;
      }

      callback(0);
    });

    const workoutRender = render(<WorkoutActiveScreen {...props} />);

    expect(workoutRender.getAllByText('Bench Press').length).toBeGreaterThan(0);
    expect(workoutRender.getByText('Previous 8 x 130')).toBeTruthy();
    expect(workoutRender.getByText('Timer 1:00')).toBeTruthy();

    const headerOptions = getLatestHeaderOptions(props);
    const HeaderTitle = headerOptions.headerTitle as () => React.JSX.Element;
    const HeaderRight = headerOptions.headerRight as () => React.JSX.Element;
    const titleElement = HeaderTitle();
    const rightElement = HeaderRight();

    expect(titleElement.props.title).toBe('Push A');
    expect(titleElement.props.completedExerciseCount).toBe(0);
    expect(titleElement.props.totalExerciseCount).toBe(1);
    expect(rightElement.props.durationLabel).toBe('1m');

    const repsInput = workoutRender.getByLabelText('Bench Press set 1 reps');
    const weightInput = workoutRender.getByLabelText(
      'Bench Press set 1 weight',
    );

    fireEvent.changeText(repsInput, '10');
    fireEvent(repsInput, 'endEditing');
    fireEvent.changeText(weightInput, '140.5');
    fireEvent(weightInput, 'endEditing');
    fireEvent.press(
      workoutRender.getByLabelText('View details for Bench Press'),
    );
    fireEvent.press(workoutRender.getByLabelText('Start Bench Press timer'));
    fireEvent.press(workoutRender.getByLabelText('Log Bench Press set 1'));
    fireEvent.press(workoutRender.getByText('Add set'));
    fireEvent.press(workoutRender.getByLabelText('Delete Bench Press set 1'));
    mockShowActionSheetWithOptions.mockImplementationOnce((_, callback) => {
      callback(1);
    });
    fireEvent.press(workoutRender.getByLabelText('Options for Bench Press'));
    fireEvent.press(workoutRender.getByText('Complete Workout'));

    expect(navigate).toHaveBeenCalledWith('ExerciseDetail', {
      exerciseId: 'exercise-1',
    });
    expect(updateReps).toHaveBeenCalledWith('set-1', 10);
    expect(updateWeight).toHaveBeenCalledWith('set-1', 140.5);
    expect(toggleSetLogged).toHaveBeenCalledWith('set-1', true);
    expect(setExerciseTimerDuration).toHaveBeenCalledWith('exercise-1', 90);
    expect(startExerciseTimer).toHaveBeenNthCalledWith(1, 'exercise-1', 90);
    expect(startExerciseTimer).toHaveBeenNthCalledWith(2, 'exercise-1', 60);
    expect(addSet).toHaveBeenCalledWith('exercise-1');
    expect(deleteSet).toHaveBeenCalledWith('set-1');
    expect(removeExercise).toHaveBeenCalledWith('exercise-1');
    expect(completeWorkout).toHaveBeenCalledTimes(1);
  });

  it('does not collapse the workout when drilling into exercise detail', () => {
    const props = createWorkoutActiveScreenProps();
    const collapseWorkout = jest.fn();
    const addListener = jest.fn();
    props.navigation.addListener =
      addListener as typeof props.navigation.addListener;

    mockWorkoutStoreState({
      isWorkoutActive: true,
      isWorkoutCollapsed: false,
      activeSession: null,
      startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
      restTimerEndsAt: null,
      collapseWorkout,
      expandWorkout: jest.fn(),
      startRestTimer: jest.fn(),
      clearRestTimer: jest.fn(),
    });
    mockUseActiveWorkout.mockReturnValue({
      activeSession: {
        id: 'session-1',
        title: 'Push A',
        startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
        isFreeWorkout: false,
        exercises: [],
      },
      addExercise: jest.fn(),
      removeExercise: jest.fn(),
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      toggleSetLogged: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
      deleteWorkout: jest.fn().mockReturnValue(true),
    });

    render(<WorkoutActiveScreen {...props} />);

    const beforeRemoveHandler = addListener.mock.calls.find(
      ([eventName]) => eventName === 'beforeRemove',
    )?.[1] as (event: {
      preventDefault: jest.Mock;
      data: { action: { type: string; payload: { name: string } } };
    }) => void;

    const preventDefault = jest.fn();
    beforeRemoveHandler({
      preventDefault,
      data: {
        action: {
          type: 'NAVIGATE',
          payload: { name: 'ExerciseDetail' },
        },
      },
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(collapseWorkout).not.toHaveBeenCalled();
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
          how_to: null,
          equipment: null,
        },
        {
          id: 'exercise-2',
          name: 'Goblet Squat',
          muscle_group: 'Legs',
          how_to: null,
          equipment: null,
        },
      ],
      hasLoaded: true,
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
      removeExercise: jest.fn(),
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      toggleSetLogged: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
      deleteWorkout: jest.fn().mockReturnValue(true),
    });

    render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByLabelText('Add exercise'));
    fireEvent.changeText(screen.getByLabelText('Search exercises'), 'goblet');
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
          how_to: null,
          equipment: null,
        },
        {
          id: 'exercise-2',
          name: 'Goblet Squat',
          muscle_group: 'Legs',
          how_to: null,
          equipment: null,
        },
      ],
      hasLoaded: true,
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
      toggleSetLogged: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
      deleteWorkout: jest.fn().mockReturnValue(true),
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
      deleteWorkout: jest.fn().mockReturnValue(true),
    });

    rerender(<WorkoutActiveScreen {...props} />);

    mockShowActionSheetWithOptions.mockImplementationOnce((_, callback) => {
      callback(1);
    });
    fireEvent.press(screen.getByLabelText('Options for Goblet Squat'));

    expect(removeExercise).toHaveBeenCalledWith('exercise-2');
  });

  it('deletes the current workout after confirmation', () => {
    const props = createWorkoutActiveScreenProps();
    const deleteWorkout = jest.fn().mockReturnValue(true);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(
      (
        _title?: string,
        _message?: string,
        buttons?: Array<{
          text?: string;
          onPress?: () => void;
          style?: string;
        }>,
      ) => {
        buttons?.find((button) => button.style === 'destructive')?.onPress?.();
      },
    );

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
    });
    mockUseActiveWorkout.mockReturnValue({
      activeSession: {
        id: 'session-1',
        title: 'Push A',
        startTime: 1_700_000_000_000,
        isFreeWorkout: false,
        exercises: [],
      },
      addExercise: jest.fn(),
      removeExercise: jest.fn(),
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      toggleSetLogged: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue(true),
      deleteWorkout,
    });

    render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByLabelText('Delete workout'));

    expect(alertSpy).toHaveBeenCalled();
    expect(deleteWorkout).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  });
});
