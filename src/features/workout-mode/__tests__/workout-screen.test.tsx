import WheelPicker from '@quidone/react-native-wheel-picker';
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import React from 'react';
import { ActionSheetIOS, Alert } from 'react-native';

import { useHistoryAnalytics } from '@features/analytics';
import { useUserProfile } from '@features/health-tracking';
import { triggerInteractionFeedback } from '@shared/utils';
import { WorkoutActiveScreen, WorkoutScreen } from '../screens/workout-screen';
import { ActiveWorkoutContent } from '../components/active-workout-content';
import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { useActiveWorkout } from '../hooks/use-active-workout';
import { usePreviousExercisePerformance } from '../hooks/use-previous-exercise-performance';
import { useExercises } from '@features/routines';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => false,
}));

jest.mock('@shared/utils', () => ({
  ...jest.requireActual('@shared/utils'),
  configureInteractionLayoutAnimation: jest.fn(),
  triggerInteractionFeedback: jest.fn(),
}));

jest.mock('react-native-gifted-charts', () => {
  const ReactNative = require('react-native');

  return {
    LineChart: ({ data }: { data: Array<unknown> }) => (
      <ReactNative.Text>LineChart {data.length}</ReactNative.Text>
    ),
  };
});

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => 96,
}));

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const ReactNative = require('react-native');

  return ({
    children,
    renderRightActions,
    testID,
  }: {
    children?: React.ReactNode;
    renderRightActions?: () => React.ReactNode;
    testID?: string;
  }) => (
    <ReactNative.View testID={testID}>
      {children}
      {renderRightActions ? (
        <ReactNative.View testID={`${testID}-actions`}>
          {renderRightActions()}
        </ReactNative.View>
      ) : null}
    </ReactNative.View>
  );
});

jest.mock('@expo/vector-icons', () => {
  const ReactNative = require('react-native');

  return {
    Feather: ({ name }: { name: string }) => (
      <ReactNative.Text>{name}</ReactNative.Text>
    ),
  };
});

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

jest.mock('react-native-tab-view', () => {
  const ReactNative = require('react-native');

  return {
    TabView: ({
      navigationState,
      onIndexChange,
      renderScene,
      renderTabBar,
    }: {
      navigationState: {
        index: number;
        routes: Array<{ key: string }>;
      };
      onIndexChange: (index: number) => void;
      renderScene: (scene: { route: { key: string } }) => React.ReactNode;
      renderTabBar?: () => React.ReactNode;
    }) => (
      <ReactNative.View
        testID="focused-workout-tab-view"
        navigationState={navigationState}
        onIndexChange={onIndexChange}
      >
        {renderTabBar?.()}
        {renderScene({
          route: navigationState.routes[navigationState.index],
        })}
      </ReactNative.View>
    ),
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
  buildDashboardMetrics: jest.requireActual(
    '../../analytics/domain/dashboard-metrics',
  ).buildDashboardMetrics,
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
const mockTriggerInteractionFeedback = jest.mocked(triggerInteractionFeedback);
const mockShowActionSheetWithOptions = jest.spyOn(
  ActionSheetIOS,
  'showActionSheetWithOptions',
);

type WorkoutTabScreenProps = React.ComponentProps<typeof WorkoutScreen>;
type WorkoutActiveScreenProps = React.ComponentProps<
  typeof WorkoutActiveScreen
>;
type WorkoutStoreState = ReturnType<typeof useWorkoutStore.getState>;
type HeroWheelTestInstance = {
  props: {
    testID?: string;
    onValueChanging: (event: {
      item: { value: number; label: string };
      index: number;
    }) => void;
    onValueChanged: (event: {
      item: { value: number; label: string };
      index: number;
    }) => void;
  };
};
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
      canGoBack: jest.fn(() => true),
      dispatch: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
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

function getHeroWheelPicker(
  view: ReturnType<typeof render>,
  testID: string,
): HeroWheelTestInstance {
  const wheel = view
    .UNSAFE_getAllByType(WheelPicker)
    .find((candidate) => candidate.props.testID === testID);

  if (!wheel) {
    throw new Error(`Expected wheel picker with testID ${testID}`);
  }

  return wheel as HeroWheelTestInstance;
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
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      allSessions: [
        {
          id: 'completed-session-1',
          routineId: 'routine-0',
          routineName: 'Pull A',
          startTime: new Date('2026-03-17T11:00:00.000Z').getTime(),
          endTime: new Date('2026-03-17T11:48:00.000Z').getTime(),
          durationMinutes: 48,
          totalSets: 12,
          totalCompletedSets: 12,
          totalReps: 96,
          totalVolume: 5240,
          exerciseCount: 5,
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
      completeWorkout: jest.fn().mockReturnValue('completed-session-1'),
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
    expect(screen.queryByText('Good morning, Alex')).toBeNull();
    expect(screen.getByText('UP NEXT')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('Streak')).toBeTruthy();
    expect(screen.getByText('Active days')).toBeTruthy();
    expect(screen.getByText('Push A')).toBeTruthy();
    expect(screen.getByText('6 exercises • 40 min')).toBeTruthy();
    expect(screen.queryByText('Signal')).toBeNull();
    expect(screen.queryByText('fallback')).toBeNull();
    expect(screen.queryByText('History')).toBeNull();

    fireEvent.press(screen.getByText('Start now'));
    fireEvent.press(screen.getByText('Free workout'));

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

    expect(screen.getByText('IN PROGRESS')).toBeTruthy();
    expect(screen.getByText('Continue now')).toBeTruthy();
    expect(screen.queryByText('Start now')).toBeNull();
    expect(screen.queryByText('Free workout')).toBeNull();

    fireEvent.press(screen.getByText('Continue now'));

    expect(expandWorkout).toHaveBeenCalledTimes(1);
  });

  it('renders the active workout session and forwards set editing actions', () => {
    const props = createWorkoutActiveScreenProps();
    const navigate = props.navigation.navigate as jest.Mock;
    const replace = props.navigation.replace as jest.Mock;
    const addExercise = jest.fn();
    const removeExercise = jest.fn();
    const addSet = jest.fn();
    const deleteSet = jest.fn();
    const updateReps = jest.fn();
    const updateWeight = jest.fn();
    const toggleSetLogged = jest.fn();
    const completeWorkout = jest.fn().mockReturnValue('session-1');
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
                targetWeight: 135,
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
    expect(workoutRender.getByText('Last: 8 x 130')).toBeTruthy();
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
    expect(workoutRender.getAllByText('135 lbs')).toHaveLength(1);

    const weightWheel = getHeroWheelPicker(
      workoutRender,
      'hero-zone-weight-wheel',
    );
    const repsWheel = getHeroWheelPicker(workoutRender, 'hero-zone-reps-wheel');

    act(() => {
      weightWheel.props.onValueChanging({
        item: { value: 140, label: '140 lbs' },
        index: 28,
      });
      weightWheel.props.onValueChanged({
        item: { value: 140, label: '140 lbs' },
        index: 28,
      });
      repsWheel.props.onValueChanging({
        item: { value: 10, label: '10' },
        index: 10,
      });
      repsWheel.props.onValueChanged({
        item: { value: 10, label: '10' },
        index: 10,
      });
    });

    expect(workoutRender.getByText('Target: 135 lbs x 8')).toBeTruthy();
    expect(workoutRender.getByText('140 lbs')).toBeTruthy();
    expect(workoutRender.getAllByText('10').length).toBeGreaterThan(0);

    fireEvent.press(workoutRender.getByText('Timer 1:00'));
    fireEvent.press(workoutRender.getAllByText('Overview')[0]);
    expect(
      workoutRender.getByText('0/1 exercises · 0/1 sets · 1080 volume'),
    ).toBeTruthy();
    expect(workoutRender.queryByText('Detail')).toBeNull();
    expect(workoutRender.queryByText('Timer')).toBeNull();
    expect(workoutRender.queryByText('Logged')).toBeNull();
    expect(workoutRender.queryByText('Pending')).toBeNull();
    fireEvent.press(workoutRender.getByText('Add set'));
    fireEvent.press(workoutRender.getByLabelText('Delete Set 1'));
    fireEvent.press(workoutRender.getByText('Remove exercise'));
    fireEvent.press(workoutRender.getAllByText('Overview')[0]);
    fireEvent.press(workoutRender.getByLabelText('Jump to Set 1'));
    fireEvent.press(workoutRender.getByText('Complete Set'));
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(updateReps).toHaveBeenCalledWith('set-1', 10);
    expect(updateWeight).toHaveBeenCalledWith('set-1', 140);
    expect(toggleSetLogged).toHaveBeenCalledWith('set-1', true);
    expect(mockTriggerInteractionFeedback).toHaveBeenCalledWith('set-log');
    expect(setExerciseTimerDuration).toHaveBeenCalledWith('exercise-1', 90);
    expect(startExerciseTimer).toHaveBeenCalledWith('exercise-1', 90);
    expect(addSet).toHaveBeenCalledWith('exercise-1');
    expect(deleteSet).toHaveBeenCalledWith('set-1');
    expect(removeExercise).toHaveBeenCalledWith('exercise-1');
    expect(completeWorkout).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('WorkoutSummary', {
      sessionId: 'session-1',
    });
    expect(navigate).not.toHaveBeenCalledWith('Tabs', { screen: 'Workout' });
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
      addExercise: jest.fn(),
      removeExercise: jest.fn(),
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      toggleSetLogged: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue('session-1'),
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

  it('renders the focused pager on the initial incomplete set and responds to index changes', () => {
    const activeSession = {
      id: 'session-1',
      title: 'Push A',
      startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
      isFreeWorkout: false,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          targetSets: 2,
          targetReps: 8,
          sets: [
            {
              id: 'set-1',
              exerciseId: 'exercise-1',
              reps: 8,
              weight: 135,
              isCompleted: true,
              targetSets: 2,
              targetReps: 8,
            },
            {
              id: 'set-2',
              exerciseId: 'exercise-1',
              reps: 6,
              weight: 135,
              isCompleted: false,
              targetSets: 2,
              targetReps: 8,
            },
          ],
        },
      ],
    };

    const view = render(
      <ActiveWorkoutContent
        activeSession={activeSession}
        now={new Date(2026, 2, 18, 8, 1, 30).getTime()}
        setCount={2}
        volume={1890}
        restLabel={null}
        onComplete={jest.fn()}
        onDeleteWorkout={jest.fn()}
        startRestTimer={jest.fn()}
        clearRestTimer={jest.fn()}
        onOpenExerciseDetails={jest.fn()}
        onOpenExerciseTimerOptions={jest.fn()}
        addSet={jest.fn()}
        addExercise={jest.fn()}
        removeExercise={jest.fn()}
        deleteSet={jest.fn()}
        updateReps={jest.fn()}
        updateWeight={jest.fn()}
        updateActualRir={jest.fn()}
        toggleSetLogged={jest.fn()}
        exerciseTimerEndsAtByExerciseId={{ 'exercise-1': null }}
        exerciseTimerDurationByExerciseId={{ 'exercise-1': 60 }}
        previousPerformanceByExerciseId={{ 'exercise-1': null }}
        showExerciseSheet={false}
        setShowExerciseSheet={jest.fn()}
        insets={{
          top: 0,
          right: 0,
          bottom: 34,
          left: 0,
        }}
      />,
    );

    const pager = view.getByTestId('focused-workout-tab-view');

    expect(pager.props.navigationState.index).toBe(1);
    expect(view.getAllByText(/Set 2 of 2/).length).toBeGreaterThan(0);

    act(() => {
      pager.props.onIndexChange(0);
    });

    expect(view.getAllByText(/Set 1 of 2/).length).toBeGreaterThan(0);
  });

  it('preserves the jumped overview location after session updates', () => {
    const activeSession = {
      id: 'session-1',
      title: 'Push A',
      startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
      isFreeWorkout: false,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          targetSets: 2,
          targetReps: 8,
          sets: [
            {
              id: 'set-1',
              exerciseId: 'exercise-1',
              reps: 8,
              weight: 135,
              isCompleted: false,
              targetSets: 2,
              targetReps: 8,
            },
            {
              id: 'set-2',
              exerciseId: 'exercise-1',
              reps: 6,
              weight: 135,
              isCompleted: false,
              targetSets: 2,
              targetReps: 8,
            },
          ],
        },
      ],
    };

    const contentProps: React.ComponentProps<typeof ActiveWorkoutContent> = {
      activeSession,
      now: new Date(2026, 2, 18, 8, 1, 30).getTime(),
      setCount: 2,
      volume: 1890,
      restLabel: null,
      onComplete: jest.fn(),
      onDeleteWorkout: jest.fn(),
      startRestTimer: jest.fn(),
      clearRestTimer: jest.fn(),
      onOpenExerciseDetails: jest.fn(),
      onOpenExerciseTimerOptions: jest.fn(),
      addSet: jest.fn(),
      addExercise: jest.fn(),
      removeExercise: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      updateActualRir: jest.fn(),
      toggleSetLogged: jest.fn(),
      exerciseTimerEndsAtByExerciseId: { 'exercise-1': null },
      exerciseTimerDurationByExerciseId: { 'exercise-1': 60 },
      previousPerformanceByExerciseId: { 'exercise-1': null },
      showExerciseSheet: false,
      setShowExerciseSheet: jest.fn(),
      insets: {
        top: 0,
        right: 0,
        bottom: 34,
        left: 0,
      },
    };

    const view = render(<ActiveWorkoutContent {...contentProps} />);

    fireEvent.press(view.getByText('Overview'));
    fireEvent.press(view.getByLabelText('Jump to Set 2'));

    expect(view.getAllByText(/Set 2 of 2/).length).toBeGreaterThan(0);

    view.rerender(
      <ActiveWorkoutContent
        {...contentProps}
        activeSession={{
          ...activeSession,
          exercises: [
            {
              ...activeSession.exercises[0],
              sets: [
                activeSession.exercises[0].sets[0],
                {
                  ...activeSession.exercises[0].sets[1],
                  reps: 7,
                  weight: 140,
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(view.getAllByText(/Set 2 of 2/).length).toBeGreaterThan(0);
  });

  it('advances to the next page on completion and finishes on the final page', () => {
    const onComplete = jest.fn();

    const view = render(
      <ActiveWorkoutContent
        activeSession={{
          id: 'session-1',
          title: 'Push A',
          startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
          isFreeWorkout: false,
          exercises: [
            {
              exerciseId: 'exercise-1',
              exerciseName: 'Bench Press',
              targetSets: 2,
              targetReps: 8,
              sets: [
                {
                  id: 'set-1',
                  exerciseId: 'exercise-1',
                  reps: 8,
                  weight: 135,
                  isCompleted: false,
                  targetSets: 2,
                  targetReps: 8,
                },
                {
                  id: 'set-2',
                  exerciseId: 'exercise-1',
                  reps: 6,
                  weight: 135,
                  isCompleted: false,
                  targetSets: 2,
                  targetReps: 8,
                },
              ],
            },
          ],
        }}
        now={new Date(2026, 2, 18, 8, 1, 30).getTime()}
        setCount={2}
        volume={1890}
        restLabel={null}
        onComplete={onComplete}
        onDeleteWorkout={jest.fn()}
        startRestTimer={jest.fn()}
        clearRestTimer={jest.fn()}
        onOpenExerciseDetails={jest.fn()}
        onOpenExerciseTimerOptions={jest.fn()}
        addSet={jest.fn()}
        addExercise={jest.fn()}
        removeExercise={jest.fn()}
        deleteSet={jest.fn()}
        updateReps={jest.fn()}
        updateWeight={jest.fn()}
        updateActualRir={jest.fn()}
        toggleSetLogged={jest.fn()}
        exerciseTimerEndsAtByExerciseId={{ 'exercise-1': null }}
        exerciseTimerDurationByExerciseId={{ 'exercise-1': 60 }}
        previousPerformanceByExerciseId={{ 'exercise-1': null }}
        showExerciseSheet={false}
        setShowExerciseSheet={jest.fn()}
        insets={{
          top: 0,
          right: 0,
          bottom: 34,
          left: 0,
        }}
      />,
    );

    fireEvent.press(view.getByText('Complete Set'));
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(view.getAllByText(/Set 2 of 2/).length).toBeGreaterThan(0);

    fireEvent.press(view.getByText('Complete Set'));
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows the selected values in the hero and keeps target guidance separate', () => {
    const activeSession = {
      id: 'session-1',
      title: 'Push A',
      startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
      isFreeWorkout: false,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          targetSets: 1,
          targetReps: 12,
          sets: [
            {
              id: 'set-1',
              exerciseId: 'exercise-1',
              reps: 12,
              weight: 135,
              isCompleted: false,
              targetSets: 1,
              targetReps: 12,
            },
          ],
        },
      ],
    };

    const view = render(
      <ActiveWorkoutContent
        activeSession={activeSession}
        now={new Date(2026, 2, 18, 8, 1, 30).getTime()}
        setCount={1}
        volume={1620}
        restLabel={null}
        onComplete={jest.fn()}
        onDeleteWorkout={jest.fn()}
        startRestTimer={jest.fn()}
        clearRestTimer={jest.fn()}
        onOpenExerciseDetails={jest.fn()}
        onOpenExerciseTimerOptions={jest.fn()}
        addSet={jest.fn()}
        addExercise={jest.fn()}
        removeExercise={jest.fn()}
        deleteSet={jest.fn()}
        updateReps={jest.fn()}
        updateWeight={jest.fn()}
        updateActualRir={jest.fn()}
        toggleSetLogged={jest.fn()}
        exerciseTimerEndsAtByExerciseId={{ 'exercise-1': null }}
        exerciseTimerDurationByExerciseId={{ 'exercise-1': 60 }}
        previousPerformanceByExerciseId={{ 'exercise-1': null }}
        showExerciseSheet={false}
        setShowExerciseSheet={jest.fn()}
        insets={{
          top: 0,
          right: 0,
          bottom: 34,
          left: 0,
        }}
      />,
    );

    expect(view.getByText('135 lbs')).toBeTruthy();
    expect(view.getByText('12')).toBeTruthy();
    expect(view.queryByText('135 lbs x 12')).toBeNull();
    expect(view.getByText('Target: 135 lbs x 12')).toBeTruthy();
  });

  it('renders the compact overview hierarchy and highlights the current row', () => {
    const view = render(
      <ActiveWorkoutContent
        activeSession={{
          id: 'session-1',
          title: 'Push A',
          startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
          isFreeWorkout: false,
          exercises: [
            {
              exerciseId: 'exercise-1',
              exerciseName: 'Bench Press',
              targetSets: 2,
              targetReps: 8,
              sets: [
                {
                  id: 'set-1',
                  exerciseId: 'exercise-1',
                  reps: 8,
                  weight: 185,
                  isCompleted: true,
                  targetSets: 2,
                  targetReps: 8,
                },
                {
                  id: 'set-2',
                  exerciseId: 'exercise-1',
                  reps: 6,
                  weight: 185,
                  isCompleted: false,
                  targetSets: 2,
                  targetReps: 8,
                },
              ],
            },
          ],
        }}
        now={new Date(2026, 2, 18, 8, 1, 30).getTime()}
        setCount={2}
        volume={2590}
        restLabel={null}
        onComplete={jest.fn()}
        onDeleteWorkout={jest.fn()}
        startRestTimer={jest.fn()}
        clearRestTimer={jest.fn()}
        onOpenExerciseDetails={jest.fn()}
        onOpenExerciseTimerOptions={jest.fn()}
        addSet={jest.fn()}
        addExercise={jest.fn()}
        removeExercise={jest.fn()}
        deleteSet={jest.fn()}
        updateReps={jest.fn()}
        updateWeight={jest.fn()}
        updateActualRir={jest.fn()}
        toggleSetLogged={jest.fn()}
        exerciseTimerEndsAtByExerciseId={{ 'exercise-1': null }}
        exerciseTimerDurationByExerciseId={{ 'exercise-1': 60 }}
        previousPerformanceByExerciseId={{ 'exercise-1': null }}
        showExerciseSheet={false}
        setShowExerciseSheet={jest.fn()}
        insets={{
          top: 0,
          right: 0,
          bottom: 34,
          left: 0,
        }}
      />,
    );

    fireEvent.press(view.getByText('Overview'));

    expect(view.getByText('+ Add exercise')).toBeTruthy();
    expect(
      view.getByText('0/1 exercises · 1/2 sets · 2590 volume'),
    ).toBeTruthy();
    expect(view.queryByText('Jump')).toBeNull();
    expect(view.queryByText('Logged')).toBeNull();
    expect(view.queryByText('Pending')).toBeNull();
    expect(view.queryByText('Detail')).toBeNull();
    expect(view.queryByText('Timer')).toBeNull();
    expect(
      within(view.getByTestId('jump-set-1')).getByText('185 × 8'),
    ).toBeTruthy();
    expect(view.getByTestId('jump-set-2').props.className).toContain(
      'border-accent',
    );
  });

  it('settles hero wheel changes and commits the logged value', () => {
    const updateWeight = jest.fn();
    const activeSession = {
      id: 'session-1',
      title: 'Push A',
      startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
      isFreeWorkout: false,
      exercises: [
        {
          exerciseId: 'exercise-1',
          exerciseName: 'Bench Press',
          targetSets: 1,
          targetReps: 8,
          sets: [
            {
              id: 'set-1',
              exerciseId: 'exercise-1',
              reps: 8,
              weight: 135,
              targetWeight: 140,
              isCompleted: false,
              targetSets: 1,
              targetReps: 8,
            },
          ],
        },
      ],
    };

    const view = render(
      <ActiveWorkoutContent
        activeSession={activeSession}
        now={new Date(2026, 2, 18, 8, 1, 30).getTime()}
        setCount={1}
        volume={1620}
        restLabel={null}
        onComplete={jest.fn()}
        onDeleteWorkout={jest.fn()}
        startRestTimer={jest.fn()}
        clearRestTimer={jest.fn()}
        onOpenExerciseDetails={jest.fn()}
        onOpenExerciseTimerOptions={jest.fn()}
        addSet={jest.fn()}
        addExercise={jest.fn()}
        removeExercise={jest.fn()}
        deleteSet={jest.fn()}
        updateReps={jest.fn()}
        updateWeight={updateWeight}
        updateActualRir={jest.fn()}
        toggleSetLogged={jest.fn()}
        exerciseTimerEndsAtByExerciseId={{ 'exercise-1': null }}
        exerciseTimerDurationByExerciseId={{ 'exercise-1': 60 }}
        previousPerformanceByExerciseId={{ 'exercise-1': null }}
        showExerciseSheet={false}
        setShowExerciseSheet={jest.fn()}
        insets={{
          top: 0,
          right: 0,
          bottom: 34,
          left: 0,
        }}
      />,
    );

    const weightWheel = getHeroWheelPicker(view, 'hero-zone-weight-wheel');

    expect(updateWeight).not.toHaveBeenCalled();

    act(() => {
      weightWheel.props.onValueChanging({
        item: { value: 150, label: '150 lbs' },
        index: 30,
      });
      weightWheel.props.onValueChanged({
        item: { value: 150, label: '150 lbs' },
        index: 30,
      });
    });

    expect(view.getAllByText('150 lbs').length).toBeGreaterThan(0);
    expect(updateWeight).toHaveBeenCalledWith('set-1', 150);
  });

  it('commits previewed hero values before updating RIR', () => {
    const updateReps = jest.fn();
    const updateWeight = jest.fn();
    const updateActualRir = jest.fn();

    const view = render(
      <ActiveWorkoutContent
        activeSession={{
          id: 'session-1',
          title: 'Push A',
          startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
          isFreeWorkout: false,
          exercises: [
            {
              exerciseId: 'exercise-1',
              exerciseName: 'Bench Press',
              targetSets: 1,
              targetReps: 8,
              sets: [
                {
                  id: 'set-1',
                  exerciseId: 'exercise-1',
                  reps: 8,
                  weight: 135,
                  isCompleted: false,
                  targetSets: 1,
                  targetReps: 8,
                },
              ],
            },
          ],
        }}
        now={new Date(2026, 2, 18, 8, 1, 30).getTime()}
        setCount={1}
        volume={1080}
        restLabel={null}
        onComplete={jest.fn()}
        onDeleteWorkout={jest.fn()}
        startRestTimer={jest.fn()}
        clearRestTimer={jest.fn()}
        onOpenExerciseDetails={jest.fn()}
        onOpenExerciseTimerOptions={jest.fn()}
        addSet={jest.fn()}
        addExercise={jest.fn()}
        removeExercise={jest.fn()}
        deleteSet={jest.fn()}
        updateReps={updateReps}
        updateWeight={updateWeight}
        updateActualRir={updateActualRir}
        toggleSetLogged={jest.fn()}
        exerciseTimerEndsAtByExerciseId={{ 'exercise-1': null }}
        exerciseTimerDurationByExerciseId={{ 'exercise-1': 60 }}
        previousPerformanceByExerciseId={{ 'exercise-1': null }}
        showExerciseSheet={false}
        setShowExerciseSheet={jest.fn()}
        insets={{
          top: 0,
          right: 0,
          bottom: 34,
          left: 0,
        }}
      />,
    );

    const weightWheel = getHeroWheelPicker(view, 'hero-zone-weight-wheel');
    const repsWheel = getHeroWheelPicker(view, 'hero-zone-reps-wheel');

    act(() => {
      weightWheel.props.onValueChanging({
        item: { value: 145, label: '145 lbs' },
        index: 29,
      });
      repsWheel.props.onValueChanging({
        item: { value: 9, label: '9' },
        index: 9,
      });
    });

    fireEvent.press(view.getByLabelText('Set RIR to 2'));

    expect(updateWeight).toHaveBeenCalledWith('set-1', 145);
    expect(updateReps).toHaveBeenCalledWith('set-1', 9);
    expect(updateActualRir).toHaveBeenCalledWith('set-1', 2);
  });

  it('keeps both hero wheels visible at the same time', () => {
    const view = render(
      <ActiveWorkoutContent
        activeSession={{
          id: 'session-1',
          title: 'Push A',
          startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
          isFreeWorkout: false,
          exercises: [
            {
              exerciseId: 'exercise-1',
              exerciseName: 'Bench Press',
              targetSets: 1,
              targetRepsMin: 8,
              targetRepsMax: 10,
              sets: [
                {
                  id: 'set-1',
                  exerciseId: 'exercise-1',
                  reps: 8,
                  weight: 135,
                  isCompleted: false,
                  targetSets: 1,
                  targetRepsMin: 8,
                  targetRepsMax: 10,
                },
              ],
            },
          ],
        }}
        now={new Date(2026, 2, 18, 8, 1, 30).getTime()}
        setCount={1}
        volume={1080}
        restLabel={null}
        onComplete={jest.fn()}
        onDeleteWorkout={jest.fn()}
        startRestTimer={jest.fn()}
        clearRestTimer={jest.fn()}
        onOpenExerciseDetails={jest.fn()}
        onOpenExerciseTimerOptions={jest.fn()}
        addSet={jest.fn()}
        addExercise={jest.fn()}
        removeExercise={jest.fn()}
        deleteSet={jest.fn()}
        updateReps={jest.fn()}
        updateWeight={jest.fn()}
        updateActualRir={jest.fn()}
        toggleSetLogged={jest.fn()}
        exerciseTimerEndsAtByExerciseId={{ 'exercise-1': null }}
        exerciseTimerDurationByExerciseId={{ 'exercise-1': 60 }}
        previousPerformanceByExerciseId={{ 'exercise-1': null }}
        showExerciseSheet={false}
        setShowExerciseSheet={jest.fn()}
        insets={{
          top: 0,
          right: 0,
          bottom: 34,
          left: 0,
        }}
      />,
    );

    expect(view.getByTestId('hero-zone-weight-wheel')).toBeTruthy();
    expect(view.getByTestId('hero-zone-reps-wheel')).toBeTruthy();
  });

  it('moves the focused wheel emphasis with the selected value', () => {
    const updateWeight = jest.fn();
    const view = render(
      <ActiveWorkoutContent
        activeSession={{
          id: 'session-1',
          title: 'Push A',
          startTime: new Date(2026, 2, 18, 8, 0, 0).getTime(),
          isFreeWorkout: false,
          exercises: [
            {
              exerciseId: 'exercise-1',
              exerciseName: 'Bench Press',
              targetSets: 1,
              targetReps: 8,
              sets: [
                {
                  id: 'set-1',
                  exerciseId: 'exercise-1',
                  reps: 8,
                  weight: 135,
                  targetWeight: 140,
                  isCompleted: false,
                  targetSets: 1,
                  targetReps: 8,
                },
              ],
            },
          ],
        }}
        now={new Date(2026, 2, 18, 8, 1, 30).getTime()}
        setCount={1}
        volume={1620}
        restLabel={null}
        onComplete={jest.fn()}
        onDeleteWorkout={jest.fn()}
        startRestTimer={jest.fn()}
        clearRestTimer={jest.fn()}
        onOpenExerciseDetails={jest.fn()}
        onOpenExerciseTimerOptions={jest.fn()}
        addSet={jest.fn()}
        addExercise={jest.fn()}
        removeExercise={jest.fn()}
        deleteSet={jest.fn()}
        updateReps={jest.fn()}
        updateWeight={updateWeight}
        updateActualRir={jest.fn()}
        toggleSetLogged={jest.fn()}
        exerciseTimerEndsAtByExerciseId={{ 'exercise-1': null }}
        exerciseTimerDurationByExerciseId={{ 'exercise-1': 60 }}
        previousPerformanceByExerciseId={{ 'exercise-1': null }}
        showExerciseSheet={false}
        setShowExerciseSheet={jest.fn()}
        insets={{
          top: 0,
          right: 0,
          bottom: 34,
          left: 0,
        }}
      />,
    );

    const weightWheel = getHeroWheelPicker(view, 'hero-zone-weight-wheel');

    expect(
      within(view.getByTestId('hero-zone-weight-option-current')).getByText(
        '135 lbs',
      ),
    ).toBeTruthy();

    act(() => {
      weightWheel.props.onValueChanging({
        item: { value: 145, label: '145 lbs' },
        index: 29,
      });
      weightWheel.props.onValueChanged({
        item: { value: 145, label: '145 lbs' },
        index: 29,
      });
    });

    expect(
      within(view.getByTestId('hero-zone-weight-option-current')).getByText(
        '145 lbs',
      ),
    ).toBeTruthy();
    expect(updateWeight).toHaveBeenCalledWith('set-1', 145);
  });

  it('allows the summary transition to bypass the exit guard after completion', () => {
    const props = createWorkoutActiveScreenProps();
    const collapseWorkout = jest.fn();
    const addListener = jest.fn();
    const completeWorkout = jest.fn().mockReturnValue('session-1');
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
      addExercise: jest.fn(),
      removeExercise: jest.fn(),
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      toggleSetLogged: jest.fn(),
      completeWorkout,
      deleteWorkout: jest.fn().mockReturnValue(true),
    });

    const workoutRender = render(<WorkoutActiveScreen {...props} />);
    const beforeRemoveHandler = addListener.mock.calls.find(
      ([eventName]) => eventName === 'beforeRemove',
    )?.[1] as (event: {
      preventDefault: jest.Mock;
      data: { action: { type: string; payload?: unknown } };
    }) => void;

    fireEvent.press(workoutRender.getByText('Complete Set'));
    act(() => {
      jest.advanceTimersByTime(200);
    });

    const preventDefault = jest.fn();
    beforeRemoveHandler({
      preventDefault,
      data: {
        action: {
          type: 'REPLACE',
          payload: { name: 'WorkoutSummary' },
        },
      },
    });

    expect(completeWorkout).toHaveBeenCalledTimes(1);
    expect(props.navigation.replace).toHaveBeenCalledWith('WorkoutSummary', {
      sessionId: 'session-1',
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
          is_deleted: 0,
        },
        {
          id: 'exercise-2',
          name: 'Goblet Squat',
          muscle_group: 'Legs',
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
      completeWorkout: jest.fn().mockReturnValue('session-1'),
      deleteWorkout: jest.fn().mockReturnValue(true),
    });

    render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByText('Overview'));
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
          is_deleted: 0,
        },
        {
          id: 'exercise-2',
          name: 'Goblet Squat',
          muscle_group: 'Legs',
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
      completeWorkout: jest.fn().mockReturnValue('session-1'),
      deleteWorkout: jest.fn().mockReturnValue(true),
    });

    const { rerender } = render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByText('Overview'));
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
      completeWorkout: jest.fn().mockReturnValue('session-1'),
      deleteWorkout: jest.fn().mockReturnValue(true),
    });

    rerender(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByText('Overview'));
    fireEvent.press(screen.getByText('Remove exercise'));

    expect(removeExercise).toHaveBeenCalledWith('exercise-2');
  });

  it('deletes the current workout after confirmation', () => {
    const props = createWorkoutActiveScreenProps();
    const deleteWorkout = jest.fn().mockReturnValue(true);
    const goBack = props.navigation.goBack as jest.Mock;
    const navigate = props.navigation.navigate as jest.Mock;
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
      completeWorkout: jest.fn().mockReturnValue('session-1'),
      deleteWorkout,
    });

    render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByText('Overview'));
    fireEvent.press(screen.getByLabelText('Delete workout'));

    expect(alertSpy).toHaveBeenCalled();
    expect(deleteWorkout).toHaveBeenCalledTimes(1);
    expect(goBack).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalledWith('Tabs', { screen: 'Workout' });
    alertSpy.mockRestore();
  });
});
