import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { FocusedWorkoutScene } from '../components/focused-workout-scene';
import { useWorkoutStore } from '../store';
import type { ActiveWorkoutSession } from '../types';

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => true,
}));

const singleExerciseSession: ActiveWorkoutSession = {
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

const multiExerciseSession: ActiveWorkoutSession = {
  id: 'session-2',
  title: 'Upper B',
  startTime: new Date(2026, 2, 19, 9, 0, 0).getTime(),
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
          reps: 8,
          weight: 140,
          isCompleted: false,
          targetSets: 2,
          targetReps: 8,
          targetRepsMin: 8,
          targetRepsMax: 10,
          actualRir: 1,
        },
      ],
    },
    {
      exerciseId: 'exercise-2',
      exerciseName: 'Row',
      targetSets: 2,
      targetReps: 10,
      targetRepsMin: 10,
      targetRepsMax: 12,
      sets: [
        {
          id: 'set-3',
          exerciseId: 'exercise-2',
          reps: 10,
          weight: 95,
          isCompleted: false,
          targetSets: 2,
          targetReps: 10,
          targetRepsMin: 10,
          targetRepsMax: 12,
          actualRir: 1,
        },
        {
          id: 'set-4',
          exerciseId: 'exercise-2',
          reps: 10,
          weight: 100,
          isCompleted: false,
          targetSets: 2,
          targetReps: 10,
          targetRepsMin: 10,
          targetRepsMax: 12,
          actualRir: 1,
        },
      ],
    },
  ],
};

function seedActiveWorkout(session: ActiveWorkoutSession): void {
  useWorkoutStore.getState().endWorkout();
  useWorkoutStore.getState().startWorkout(session);
}

interface HarnessOptions {
  initialFocusedSetId?: string;
  onMoveFocus?: jest.Mock;
  onOpenExerciseDetails?: jest.Mock;
  onOpenExerciseTimerOptions?: jest.Mock;
  onCompleteWorkout?: jest.Mock;
  updateWeight?: jest.Mock;
  updateReps?: jest.Mock;
  updateActualRir?: jest.Mock;
  toggleSetLogged?: jest.Mock;
}

function FocusedWorkoutHarness({
  initialFocusedSetId = 'set-1',
  onMoveFocus,
  onOpenExerciseDetails,
  onOpenExerciseTimerOptions,
  onCompleteWorkout,
  updateWeight,
  updateReps,
  updateActualRir,
  toggleSetLogged,
}: HarnessOptions): React.JSX.Element {
  const [focusedSetId, setFocusedSetId] = React.useState(initialFocusedSetId);

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
      onOpenExerciseDetails={(exerciseId) => {
        onOpenExerciseDetails?.(exerciseId);
      }}
      onOpenExerciseTimerOptions={(exerciseId) => {
        onOpenExerciseTimerOptions?.(exerciseId);
      }}
      onMoveFocus={(nextSetId) => {
        onMoveFocus?.(nextSetId);

        if (nextSetId !== null) {
          setFocusedSetId(nextSetId);
        }
      }}
      onCompleteWorkout={() => {
        onCompleteWorkout?.();
      }}
      updateReps={(setId, reps) => {
        updateReps?.(setId, reps);
        useWorkoutStore.getState().updateSet(setId, { reps });
      }}
      updateWeight={(setId, weight) => {
        updateWeight?.(setId, weight);
        useWorkoutStore.getState().updateSet(setId, { weight });
      }}
      updateActualRir={(setId, actualRir) => {
        updateActualRir?.(setId, actualRir);
        useWorkoutStore.getState().updateSet(setId, { actualRir });
      }}
      toggleSetLogged={(setId, isCompleted) => {
        toggleSetLogged?.(setId, isCompleted);
        useWorkoutStore.getState().updateSet(setId, { isCompleted });
      }}
    />
  );
}

describe('focused workout scene guidance stability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps linear one-step tap navigation across exercise boundaries', () => {
    seedActiveWorkout(multiExerciseSession);
    render(<FocusedWorkoutHarness initialFocusedSetId="set-2" />);

    expect(screen.getByText(/Set 2 of 2/)).toBeTruthy();
    expect(screen.getByText('Bench Press')).toBeTruthy();

    fireEvent.press(screen.getByTestId('stack-preview-next-transition'));

    expect(screen.getByText(/Set 1 of 2/)).toBeTruthy();
    expect(screen.getByText('Row')).toBeTruthy();

    fireEvent.press(screen.getByTestId('stack-preview-previous-transition'));

    expect(screen.getByText(/Set 2 of 2/)).toBeTruthy();
    expect(screen.getByText('Bench Press')).toBeTruthy();
  });

  it('applies first/last boundary no-op behavior', () => {
    seedActiveWorkout(multiExerciseSession);
    const onMoveFocus = jest.fn();

    const firstRender = render(
      <FocusedWorkoutHarness
        initialFocusedSetId="set-1"
        onMoveFocus={onMoveFocus}
      />,
    );

    expect(screen.getByTestId('stack-preview-previous-empty')).toBeTruthy();

    expect(screen.getByText(/Set 1 of 2/)).toBeTruthy();
    expect(onMoveFocus).not.toHaveBeenCalled();

    firstRender.unmount();

    render(
      <FocusedWorkoutHarness
        initialFocusedSetId="set-4"
        onMoveFocus={onMoveFocus}
      />,
    );

    expect(screen.getByTestId('stack-preview-next-empty')).toBeTruthy();

    expect(screen.getByText('Row')).toBeTruthy();
    expect(screen.getByText(/Set 2 of 2/)).toBeTruthy();
  });

  it('renders local adjacency as numeric and cross-exercise adjacency as label-first', () => {
    seedActiveWorkout(multiExerciseSession);
    render(<FocusedWorkoutHarness initialFocusedSetId="set-2" />);

    expect(screen.getByTestId('stack-preview-previous-local')).toBeTruthy();
    expect(screen.getByText('↑ 135 x 8')).toBeTruthy();

    expect(screen.getByTestId('stack-preview-next-transition')).toBeTruthy();
    expect(screen.getByText('↓ Row · 1/2')).toBeTruthy();
  });

  it('renders persistent numeric inputs for weight and reps', () => {
    seedActiveWorkout(singleExerciseSession);
    render(<FocusedWorkoutHarness />);

    expect(screen.getByTestId('active-set-weight-input').props.value).toBe(
      '135',
    );
    expect(screen.getByTestId('active-set-reps-input').props.value).toBe('8');
    expect(screen.getByText('lbs')).toBeTruthy();
    expect(screen.getByText('reps')).toBeTruthy();
  });

  it('keeps the scene interactive without a modal edit state', () => {
    seedActiveWorkout(singleExerciseSession);
    const onOpenExerciseDetails = jest.fn();
    const onOpenExerciseTimerOptions = jest.fn();

    render(
      <FocusedWorkoutHarness
        onOpenExerciseDetails={onOpenExerciseDetails}
        onOpenExerciseTimerOptions={onOpenExerciseTimerOptions}
      />,
    );

    fireEvent.press(screen.getByTestId('stack-preview-next-local'));
    expect(screen.getByText(/Set 2 of 2/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Set RIR to 0'));
    expect(useWorkoutStore.getState().activeSetsById['set-2']?.actualRir).toBe(
      0,
    );

    fireEvent.press(screen.getByText('Notes'));
    fireEvent.press(screen.getByText(/Timer/));
    fireEvent.press(screen.getByRole('button', { name: 'Complete Set' }));

    expect(onOpenExerciseDetails).toHaveBeenCalledTimes(1);
    expect(onOpenExerciseTimerOptions).toHaveBeenCalledTimes(1);
    expect(
      useWorkoutStore.getState().activeSetsById['set-2']?.isCompleted,
    ).toBe(true);
  });

  it('shows visible numeric inputs instead of the retired wheel editor', () => {
    seedActiveWorkout(singleExerciseSession);
    render(<FocusedWorkoutHarness />);

    expect(screen.getByTestId('active-set-weight-input')).toBeTruthy();
    expect(screen.getByTestId('active-set-reps-input')).toBeTruthy();
    expect(screen.queryByTestId('active-set-wheel-editor')).toBeNull();
  });

  it('removes explicit Previous and Next controls from the scene', () => {
    seedActiveWorkout(singleExerciseSession);
    render(<FocusedWorkoutHarness />);

    expect(screen.queryByText('Previous')).toBeNull();
    expect(screen.queryByText('Next')).toBeNull();
  });
});
