import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { FocusedWorkoutScene } from '../components/focused-workout-scene';
import { useWorkoutStore } from '../store';
import type { ActiveWorkoutSession } from '../types';

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => true,
}));

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
      targetRepsMin: 8,
      targetRepsMax: 10,
      sets: [
        {
          id: 'set-1',
          exerciseId: 'exercise-1',
          reps: 8,
          weight: 135,
          isCompleted: false,
          targetSets: 2,
          targetReps: 8,
          targetRepsMin: 8,
          targetRepsMax: 10,
          actualRir: 2,
        },
        {
          id: 'set-2',
          exerciseId: 'exercise-1',
          reps: 10,
          weight: 155,
          isCompleted: false,
          targetSets: 2,
          targetReps: 8,
          targetRepsMin: 8,
          targetRepsMax: 10,
          actualRir: 0,
        },
      ],
    },
  ],
};

function seedActiveWorkout(): void {
  useWorkoutStore.getState().endWorkout();
  useWorkoutStore.getState().startWorkout(activeSession);
}

function FocusedWorkoutProfilerHarness(): React.JSX.Element {
  const [focusedSetId, setFocusedSetId] = React.useState('set-1');

  return (
    <FocusedWorkoutScene
      focusedSetId={focusedSetId}
      headerHeight={96}
      bottomInset={34}
      previousPerformance={{
        reps: 8,
        weight: 130,
        completedAt: new Date(2026, 2, 16, 9, 0, 0).getTime(),
      }}
      onOpenOverview={jest.fn()}
      onOpenExerciseDetails={jest.fn()}
      onOpenExerciseTimerOptions={jest.fn()}
      onMoveFocus={(nextSetId) => {
        if (nextSetId !== null) {
          setFocusedSetId(nextSetId);
        }
      }}
      onCompleteWorkout={jest.fn()}
      updateReps={(setId, reps) => {
        useWorkoutStore.getState().updateSet(setId, { reps });
      }}
      updateWeight={(setId, weight) => {
        useWorkoutStore.getState().updateSet(setId, { weight });
      }}
      updateActualRir={(setId, actualRir) => {
        useWorkoutStore.getState().updateSet(setId, { actualRir });
      }}
      toggleSetLogged={(setId, isCompleted) => {
        useWorkoutStore.getState().updateSet(setId, { isCompleted });
      }}
    />
  );
}

function moveToNextSet(): void {
  act(() => {
    fireEvent.press(screen.getByTestId('stack-preview-next-local'));
  });
}

describe('active workout profiler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedActiveWorkout();
  });

  it('shows tap preview navigation stays within two focused-scene commits', () => {
    const commits: Array<{ phase: string; actualDuration: number }> = [];

    render(
      <React.Profiler
        id="FocusedWorkoutScene"
        onRender={(_id, phase, actualDuration) => {
          commits.push({ phase, actualDuration });
        }}
      >
        <FocusedWorkoutProfilerHarness />
      </React.Profiler>,
    );

    commits.length = 0;

    moveToNextSet();

    expect(commits.length).toBeLessThanOrEqual(2);
    expect(screen.getByText(/Set 2 of 2/)).toBeTruthy();
    expect(screen.getByText('On target')).toBeTruthy();
  });

  it('shows RIR updates stay within two focused-scene commits in workout state', () => {
    const commits: Array<{ phase: string; actualDuration: number }> = [];

    render(
      <React.Profiler
        id="FocusedWorkoutScene"
        onRender={(_id, phase, actualDuration) => {
          commits.push({ phase, actualDuration });
        }}
      >
        <FocusedWorkoutProfilerHarness />
      </React.Profiler>,
    );

    commits.length = 0;

    act(() => {
      fireEvent(screen.getByLabelText('Set RIR to 0'), 'onPress');
    });

    expect(commits.length).toBeLessThanOrEqual(2);
  });

  it('advances immediately on Complete Set within two focused-scene commits', () => {
    const commits: Array<{ phase: string; actualDuration: number }> = [];

    render(
      <React.Profiler
        id="FocusedWorkoutScene"
        onRender={(_id, phase, actualDuration) => {
          commits.push({ phase, actualDuration });
        }}
      >
        <FocusedWorkoutProfilerHarness />
      </React.Profiler>,
    );

    commits.length = 0;

    act(() => {
      fireEvent(screen.getByLabelText('Complete Set'), 'onPress');
    });

    expect(screen.getByText(/Set 2 of 2/)).toBeTruthy();
    expect(commits.length).toBeLessThanOrEqual(2);
  });
});
