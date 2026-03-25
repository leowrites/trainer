import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { FocusedWorkoutScene } from '../components/focused-workout-scene';
import { useWorkoutStore } from '../store';
import type { ActiveWorkoutSession } from '../types';

const queuedStaleCommits: Array<() => void> = [];

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => false,
}));

jest.mock('@expo/vector-icons', () => {
  const ReactNative = require('react-native');

  return {
    Feather: ({ name }: { name: string }) => (
      <ReactNative.Text>{name}</ReactNative.Text>
    ),
  };
});

jest.mock('@quidone/react-native-wheel-picker', () => {
  const React = require('react');
  const ReactNative = require('react-native');

  const MockWheelPicker = ({
    value,
    onValueChanging,
    onValueChanged,
    testID,
  }: {
    value: number;
    onValueChanging?: (event: { item: { value: number } }) => void;
    onValueChanged?: (event: { item: { value: number } }) => void;
    testID?: string;
  }): React.JSX.Element => {
    React.useEffect(() => {
      // Simulate library-driven programmatic sync updates when value prop changes.
      onValueChanging?.({ item: { value: Math.max(0, value - 1) } });
    }, [onValueChanging, value]);

    React.useEffect(() => {
      queuedStaleCommits.push(() => {
        onValueChanged?.({ item: { value: value + 5 } });
      });
    }, [onValueChanged, value]);

    return (
      <ReactNative.Pressable
        testID={`${testID}-commit`}
        onPress={() => onValueChanged?.({ item: { value } })}
      />
    );
  };

  return {
    __esModule: true,
    default: MockWheelPicker,
  };
});

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

function FocusedWorkoutHarness(): React.JSX.Element {
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

describe('focused workout scene guidance stability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queuedStaleCommits.length = 0;
    seedActiveWorkout();
  });

  it('keeps set navigation to one focused-scene commit under programmatic wheel sync', () => {
    const commits: Array<{ phase: string; actualDuration: number }> = [];

    render(
      <React.Profiler
        id="FocusedWorkoutScene"
        onRender={(_id, phase, actualDuration) => {
          commits.push({ phase, actualDuration });
        }}
      >
        <FocusedWorkoutHarness />
      </React.Profiler>,
    );

    commits.length = 0;

    act(() => {
      fireEvent.press(screen.getByText('Next'));
    });

    expect(screen.getByText(/Set 2 of 2/)).toBeTruthy();
    expect(screen.getByText('On target')).toBeTruthy();
    expect(commits).toHaveLength(1);
  });

  it('ignores stale wheel commit callbacks after focus moves to another set', () => {
    render(<FocusedWorkoutHarness />);

    const staleCallbackCount = queuedStaleCommits.length;

    act(() => {
      fireEvent.press(screen.getByText('Next'));
    });

    act(() => {
      queuedStaleCommits.slice(0, staleCallbackCount).forEach((callback) => {
        callback();
      });
    });

    const setOne = useWorkoutStore.getState().activeSetsById['set-1'];
    expect(setOne?.reps).toBe(8);
    expect(setOne?.weight).toBe(135);
  });
});
