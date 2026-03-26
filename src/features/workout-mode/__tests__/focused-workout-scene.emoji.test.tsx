import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { FocusedWorkoutScene } from '../components/focused-workout-scene';
import { useWorkoutStore } from '../store';
import type { ActiveWorkoutSession } from '../types';

jest.mock('@shared/hooks', () => ({
  useReducedMotionPreference: () => true,
}));

const session: ActiveWorkoutSession = {
  id: 'session-emoji',
  title: 'Emoji Session',
  startTime: new Date(2026, 2, 25, 8, 0, 0).getTime(),
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
  ],
};

function renderScene(focusedSetId: string): void {
  render(
    <FocusedWorkoutScene
      focusedSetId={focusedSetId}
      headerHeight={96}
      bottomInset={34}
      previousPerformance={null}
      onOpenOverview={jest.fn()}
      onOpenExerciseDetails={jest.fn()}
      onOpenExerciseTimerOptions={jest.fn()}
      onMoveFocus={jest.fn()}
      onCompleteWorkout={jest.fn()}
      updateReps={jest.fn()}
      updateWeight={jest.fn()}
      updateActualRir={jest.fn()}
      toggleSetLogged={jest.fn()}
    />,
  );
}

describe('focused workout scene empty preview states', () => {
  beforeEach(() => {
    useWorkoutStore.getState().endWorkout();
    useWorkoutStore.getState().startWorkout(session);
  });

  it('renders an empty previous preview slot at the start of the workout', () => {
    renderScene('set-1');
    expect(screen.getByTestId('stack-preview-previous-empty')).toBeTruthy();
    expect(screen.queryByText('Start of workout 💪')).toBeNull();
  });

  it('renders an empty next preview slot at the end of the workout', () => {
    renderScene('set-2');
    expect(screen.getByTestId('stack-preview-next-empty')).toBeTruthy();
    expect(screen.queryByText('End of workout 🎉')).toBeNull();
  });
});
