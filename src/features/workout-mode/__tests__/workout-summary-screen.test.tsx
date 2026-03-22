import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { WorkoutSummaryScreen } from '../screens/workout-summary-screen';
import { useWorkoutSummary } from '../hooks/use-workout-summary';

jest.mock('../hooks/use-workout-summary', () => ({
  useWorkoutSummary: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: React.PropsWithChildren) => children,
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

const mockUseWorkoutSummary = jest.mocked(useWorkoutSummary);

describe('WorkoutSummaryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the completed workout summary with badges and schedule context', () => {
    const goBack = jest.fn();
    const navigate = jest.fn();

    mockUseWorkoutSummary.mockReturnValue({
      isLoading: false,
      saveFeedback: jest.fn(),
      summary: {
        unit: 'kg',
        completedAtLabel: '8:42 AM',
        dateLabel: 'Mar 21, 2026',
        durationLabel: '42m',
        volumeLabel: '5,240 kg',
        streakLabel: '3 week streak',
        weeklyProgressLabel: '2 workouts completed this week',
        effortLevel: 4,
        fatigueLevel: 3,
        scheduleContext: {
          scheduleName: 'Upper Split',
          completedRoutineName: 'Pull A',
          completedPositionLabel: '2 of 4',
          nextRoutineName: 'Legs A',
        },
        recordBadges: [
          {
            id: 'session-volume',
            label: 'Session Volume',
            detail: 'New best total at 5,240 kg.',
            tone: 'accent',
            exerciseId: null,
            exerciseName: null,
          },
        ],
        session: {
          id: 'session-1',
          routineId: 'routine-1',
          routineName: 'Pull A',
          startTime: 1,
          endTime: 2,
          durationMinutes: 42,
          totalSets: 12,
          totalCompletedSets: 12,
          totalReps: 84,
          totalVolume: 5240,
          exerciseCount: 3,
          exercises: [
            {
              exerciseId: 'exercise-1',
              exerciseName: 'Row',
              targetSets: 4,
              targetReps: 8,
              sets: [],
              totalSets: 4,
              completedSets: 4,
              totalReps: 32,
              totalVolume: 2400,
            },
          ],
        },
      },
    });

    render(
      <WorkoutSummaryScreen
        navigation={
          {
            canGoBack: jest.fn(() => true),
            goBack,
            navigate,
            setOptions: jest.fn(),
          } as never
        }
        route={{
          key: 'WorkoutSummary-key',
          name: 'WorkoutSummary',
          params: { sessionId: 'session-1' },
        }}
      />,
    );

    expect(screen.getByText('Workout Complete')).toBeTruthy();
    expect(screen.getByText('Pull A logged.')).toBeTruthy();
    expect(screen.getByText('3 week streak')).toBeTruthy();
    expect(screen.getByText('Session Volume')).toBeTruthy();
    expect(screen.getByText('Watchouts')).toBeTruthy();
    expect(screen.getByText('No watchouts from this session.')).toBeTruthy();
    expect(screen.getByText('Upper Split')).toBeTruthy();
    expect(screen.getByText('Row')).toBeTruthy();
    expect(screen.getByText('Back to home')).toBeTruthy();

    fireEvent.press(screen.getByText('Back to home'));

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('renders watchout cards when negative signals are present', () => {
    mockUseWorkoutSummary.mockReturnValue({
      isLoading: false,
      saveFeedback: jest.fn(),
      summary: {
        unit: 'kg',
        completedAtLabel: '8:42 AM',
        dateLabel: 'Mar 21, 2026',
        durationLabel: '42m',
        volumeLabel: '5,240 kg',
        streakLabel: '3 week streak',
        weeklyProgressLabel: '2 workouts completed this week',
        effortLevel: null,
        fatigueLevel: null,
        scheduleContext: null,
        recordBadges: [],
        negativeSignals: [
          {
            id: 'miss-exercise-1',
            label: 'Target Miss',
            detail:
              'Bench Press missed its programmed rep floor on eligible work sets.',
            tone: 'error',
            exerciseId: 'exercise-1',
            exerciseName: 'Bench Press',
          },
        ],
        session: {
          id: 'session-1',
          routineId: 'routine-1',
          routineName: 'Push A',
          startTime: 1,
          endTime: 2,
          durationMinutes: 42,
          totalSets: 6,
          totalCompletedSets: 6,
          totalReps: 48,
          totalVolume: 3000,
          exerciseCount: 2,
          exercises: [],
        },
      },
    });

    render(
      <WorkoutSummaryScreen
        navigation={
          {
            canGoBack: jest.fn(() => true),
            goBack: jest.fn(),
            navigate: jest.fn(),
            setOptions: jest.fn(),
          } as never
        }
        route={{
          key: 'WorkoutSummary-key',
          name: 'WorkoutSummary',
          params: { sessionId: 'session-1' },
        }}
      />,
    );

    expect(screen.getByText('Watchouts')).toBeTruthy();
    expect(screen.getByText('Target Miss')).toBeTruthy();
    expect(
      screen.getByText(
        'Bench Press missed its programmed rep floor on eligible work sets.',
      ),
    ).toBeTruthy();
  });

  it('saves effort and fatigue selections immediately', () => {
    const saveFeedback = jest.fn();

    mockUseWorkoutSummary.mockReturnValue({
      isLoading: false,
      saveFeedback,
      summary: {
        unit: 'kg',
        completedAtLabel: '8:42 AM',
        dateLabel: 'Mar 21, 2026',
        durationLabel: '42m',
        volumeLabel: '5,240 kg',
        streakLabel: '3 week streak',
        weeklyProgressLabel: '2 workouts completed this week',
        effortLevel: null,
        fatigueLevel: null,
        scheduleContext: null,
        recordBadges: [],
        session: {
          id: 'session-1',
          routineId: null,
          routineName: 'Free Workout',
          startTime: 1,
          endTime: 2,
          durationMinutes: 42,
          totalSets: 6,
          totalCompletedSets: 6,
          totalReps: 48,
          totalVolume: 3000,
          exerciseCount: 2,
          exercises: [],
        },
      },
    });

    render(
      <WorkoutSummaryScreen
        navigation={
          {
            canGoBack: jest.fn(() => true),
            goBack: jest.fn(),
            navigate: jest.fn(),
            setOptions: jest.fn(),
          } as never
        }
        route={{
          key: 'WorkoutSummary-key',
          name: 'WorkoutSummary',
          params: { sessionId: 'session-1' },
        }}
      />,
    );

    fireEvent.press(screen.getByLabelText('Effort level 4 Hard'));
    fireEvent.press(screen.getByLabelText('Fatigue 5 Drained'));

    expect(saveFeedback).toHaveBeenNthCalledWith(1, 'effort', 4);
    expect(saveFeedback).toHaveBeenNthCalledWith(2, 'fatigue', 5);
  });

  it('shows a loading state while the summary is resolving', () => {
    mockUseWorkoutSummary.mockReturnValue({
      isLoading: true,
      saveFeedback: jest.fn(),
      summary: null,
    });

    render(
      <WorkoutSummaryScreen
        navigation={
          {
            canGoBack: jest.fn(() => true),
            goBack: jest.fn(),
            navigate: jest.fn(),
            setOptions: jest.fn(),
          } as never
        }
        route={{
          key: 'WorkoutSummary-key',
          name: 'WorkoutSummary',
          params: { sessionId: 'session-1' },
        }}
      />,
    );

    expect(screen.getByText('Loading summary')).toBeTruthy();
  });

  it('shows a blocking alert for routine template updates', () => {
    const applyTemplateUpdate = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    mockUseWorkoutSummary.mockReturnValue({
      isLoading: false,
      saveFeedback: jest.fn(),
      applyTemplateUpdate,
      summary: {
        unit: 'kg',
        completedAtLabel: '8:42 AM',
        dateLabel: 'Mar 21, 2026',
        durationLabel: '42m',
        volumeLabel: '5,240 kg',
        streakLabel: '3 week streak',
        weeklyProgressLabel: '2 workouts completed this week',
        effortLevel: null,
        fatigueLevel: null,
        scheduleContext: null,
        recordBadges: [],
        templateUpdate: {
          routineName: 'Pull A',
          canApply: true,
          appliedAtLabel: null,
        },
        session: {
          id: 'session-1',
          routineId: 'routine-1',
          routineName: 'Pull A',
          startTime: 1,
          endTime: 2,
          durationMinutes: 42,
          totalSets: 6,
          totalCompletedSets: 6,
          totalReps: 48,
          totalVolume: 3000,
          exerciseCount: 2,
          exercises: [],
        },
      },
    });

    render(
      <WorkoutSummaryScreen
        navigation={
          {
            canGoBack: jest.fn(() => true),
            goBack: jest.fn(),
            navigate: jest.fn(),
            setOptions: jest.fn(),
          } as never
        }
        route={{
          key: 'WorkoutSummary-key',
          name: 'WorkoutSummary',
          params: { sessionId: 'session-1' },
        }}
      />,
    );

    expect(alertSpy).toHaveBeenCalledWith(
      'Update routine template?',
      expect.stringContaining('Pull A'),
      expect.any(Array),
      { cancelable: false },
    );

    const buttons = alertSpy.mock.calls[0]?.[2] as Array<{
      text: string;
      onPress?: () => void;
    }>;

    act(() => {
      buttons.find((button) => button.text === 'Apply')?.onPress?.();
    });

    expect(applyTemplateUpdate).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });
});
