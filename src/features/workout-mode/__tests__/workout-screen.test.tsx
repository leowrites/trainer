import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { useHistoryAnalytics } from '@features/analytics';
import { useUserProfile } from '@features/health-tracking';
import { useExercises } from '@features/routines';
import { WorkoutActiveScreen, WorkoutScreen } from '../screens/workout-screen';
import {
  useActiveWorkoutActions,
  useEnsureActiveWorkoutLoaded,
} from '../hooks/use-active-workout';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { usePreviousExercisePerformance } from '../hooks/use-previous-exercise-performance';
import { useWorkoutStore } from '../store';
import type { ActiveWorkoutSession } from '../types';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require('react');

    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => false,
}));

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => 96,
}));

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

jest.mock('../hooks/use-workout-starter', () => ({
  useWorkoutStarter: jest.fn(),
}));

jest.mock('../hooks/use-active-workout', () => ({
  useActiveWorkoutActions: jest.fn(),
  useEnsureActiveWorkoutLoaded: jest.fn(),
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

const mockUseWorkoutStarter = jest.mocked(useWorkoutStarter);
const mockUseActiveWorkoutActions = jest.mocked(useActiveWorkoutActions);
const mockUseEnsureActiveWorkoutLoaded = jest.mocked(
  useEnsureActiveWorkoutLoaded,
);
const mockUsePreviousExercisePerformance = jest.mocked(
  usePreviousExercisePerformance,
);
const mockUseExercises = jest.mocked(useExercises);
const mockUseHistoryAnalytics = jest.mocked(useHistoryAnalytics);
const mockUseUserProfile = jest.mocked(useUserProfile);

const activeSession: ActiveWorkoutSession = {
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
          reps: 8,
          weight: 135,
          isCompleted: false,
          targetSets: 2,
          targetReps: 8,
        },
      ],
    },
  ],
};

function createWorkoutTabScreenProps(): React.ComponentProps<
  typeof WorkoutScreen
> {
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
  } as unknown as React.ComponentProps<typeof WorkoutScreen>;
}

function createWorkoutActiveScreenProps(): React.ComponentProps<
  typeof WorkoutActiveScreen
> {
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
  } as unknown as React.ComponentProps<typeof WorkoutActiveScreen>;
}

function seedActiveWorkout(
  session: ActiveWorkoutSession = activeSession,
): void {
  useWorkoutStore.getState().endWorkout();
  useWorkoutStore.getState().startWorkout(session);
}

describe('workout screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 18, 8, 1, 30));
    useWorkoutStore.getState().endWorkout();
    mockUseEnsureActiveWorkoutLoaded.mockImplementation(() => undefined);
    mockUseActiveWorkoutActions.mockReturnValue({
      addExercise: jest.fn(),
      removeExercise: jest.fn(),
      addSet: jest.fn(),
      deleteSet: jest.fn(),
      updateExerciseRestSeconds: jest.fn(),
      updateReps: jest.fn(),
      updateWeight: jest.fn(),
      updateActualRir: jest.fn(),
      toggleSetLogged: jest.fn(),
      flushPendingWrites: jest.fn(),
      completeWorkout: jest.fn().mockReturnValue('completed-session-1'),
      deleteWorkout: jest.fn().mockReturnValue(true),
    });
    mockUsePreviousExercisePerformance.mockReturnValue({
      'exercise-1': {
        reps: 8,
        weight: 130,
        completedAt: new Date(2026, 2, 16, 9, 0, 0).getTime(),
      },
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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the current workout state on the home tab while a session is active', () => {
    const props = createWorkoutTabScreenProps();
    const expandWorkout = jest.fn();

    seedActiveWorkout({
      ...activeSession,
      exercises: [
        {
          ...activeSession.exercises[0],
          sets: [],
        },
      ],
    });
    useWorkoutStore.getState().collapseWorkout();
    useWorkoutStore.setState({ expandWorkout } as Partial<
      ReturnType<typeof useWorkoutStore.getState>
    >);
    mockUseWorkoutStarter.mockReturnValue({
      nextRoutine: null,
      startWorkoutFromSchedule: jest.fn(),
      startFreeWorkout: jest.fn(),
      refreshPreview: jest.fn(),
    });

    render(<WorkoutScreen {...props} />);

    expect(screen.getByText('IN PROGRESS')).toBeTruthy();
    expect(screen.getByText('Continue now')).toBeTruthy();

    fireEvent.press(screen.getByText('Continue now'));

    expect(expandWorkout).toHaveBeenCalledTimes(1);
  });

  it('does not rerender the home shell while starting a scheduled workout', () => {
    const props = createWorkoutTabScreenProps();
    const commits: string[] = [];
    const startWorkoutFromSchedule = jest.fn().mockReturnValue('session-1');

    mockUseWorkoutStarter.mockReturnValue({
      nextRoutine: {
        routineId: 'routine-1',
        routineName: 'Push A',
        scheduleName: 'Upper Split',
        exerciseCount: 5,
        estimatedMinutes: 45,
      },
      startWorkoutFromSchedule,
      startFreeWorkout: jest.fn(),
      refreshPreview: jest.fn(),
    });

    render(
      <React.Profiler
        id="WorkoutHomeScreen"
        onRender={(_id, phase) => {
          commits.push(phase);
        }}
      >
        <WorkoutScreen {...props} />
      </React.Profiler>,
    );

    commits.length = 0;

    act(() => {
      fireEvent(screen.getByText('Start now'), 'onPress');
    });

    expect(startWorkoutFromSchedule).toHaveBeenCalledTimes(1);
    expect(props.navigation.navigate).toHaveBeenCalledWith('ActiveWorkout');
    expect(commits).toHaveLength(0);
  });

  it('renders the active workout shell from normalized store state', () => {
    const props = createWorkoutActiveScreenProps();

    seedActiveWorkout();

    render(<WorkoutActiveScreen {...props} />);

    expect(screen.getAllByText('Bench Press').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Last: 8 x 130').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('focused-workout-tab-view')).toBeNull();

    const setOptions = props.navigation.setOptions as jest.Mock;
    const latestOptions = setOptions.mock.calls.at(-1)?.[0] as {
      headerTitle: () => React.JSX.Element;
      headerRight: () => React.JSX.Element;
    };

    expect(latestOptions.headerTitle().props.title).toBe('Push A');
    expect(latestOptions.headerRight().props.startTime).toBe(
      activeSession.startTime,
    );
  });

  it('navigates between sets with explicit controls instead of swipe tabs', () => {
    const props = createWorkoutActiveScreenProps();

    seedActiveWorkout();
    render(<WorkoutActiveScreen {...props} />);

    expect(screen.getByText(/Set 1 of 2/)).toBeTruthy();
    fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText(/Set 2 of 2/)).toBeTruthy();
    fireEvent.press(screen.getByText('Previous'));
    expect(screen.getByText(/Set 1 of 2/)).toBeTruthy();
  });

  it('opens the workout overview without triggering a selector loop', () => {
    const props = createWorkoutActiveScreenProps();

    seedActiveWorkout();
    render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByText('Overview'));

    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getByText('Delete workout')).toBeTruthy();
  });

  it('opens the overview shell immediately and loads exercise rows after the deferred tick', () => {
    const props = createWorkoutActiveScreenProps();

    seedActiveWorkout();
    render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByText('Overview'));

    expect(screen.getByText('Loading workout details...')).toBeTruthy();
    expect(screen.queryByLabelText('Jump to Set 1')).toBeNull();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByLabelText('Jump to Set 1')).toBeTruthy();
  });

  it('keeps the overview open when jumping to another set', () => {
    const props = createWorkoutActiveScreenProps();

    seedActiveWorkout();
    render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByText('Overview'));

    act(() => {
      jest.runOnlyPendingTimers();
    });

    fireEvent.press(screen.getByLabelText('Jump to Set 2'));

    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getByText(/Set 2 of 2/)).toBeTruthy();
  });

  it('keeps the overview mounted when delete workout is pressed', () => {
    const props = createWorkoutActiveScreenProps();
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    seedActiveWorkout();
    render(<WorkoutActiveScreen {...props} />);

    fireEvent.press(screen.getByText('Overview'));

    act(() => {
      jest.runOnlyPendingTimers();
    });

    fireEvent.press(screen.getByText('Delete workout'));

    expect(alertSpy).toHaveBeenCalled();
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);

    alertSpy.mockRestore();
  });

  it('does not rerender the screen shell for route-local set edits', () => {
    const props = createWorkoutActiveScreenProps();

    seedActiveWorkout();
    render(<WorkoutActiveScreen {...props} />);

    const setOptions = props.navigation.setOptions as jest.Mock;
    const initialSetOptionsCalls = setOptions.mock.calls.length;

    act(() => {
      useWorkoutStore.getState().updateSet('set-1', { reps: 10, weight: 145 });
    });

    expect(setOptions.mock.calls).toHaveLength(initialSetOptionsCalls);
  });

  it('does not rerender the screen shell for timer changes', () => {
    const props = createWorkoutActiveScreenProps();

    seedActiveWorkout();
    render(<WorkoutActiveScreen {...props} />);

    const setOptions = props.navigation.setOptions as jest.Mock;
    const initialSetOptionsCalls = setOptions.mock.calls.length;

    act(() => {
      useWorkoutStore.getState().startExerciseTimer('exercise-1', 90);
      useWorkoutStore.getState().startRestTimer(120);
    });

    expect(setOptions.mock.calls).toHaveLength(initialSetOptionsCalls);
  });
});
