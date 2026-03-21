import { render } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';

import {
  shouldHandleHorizontalGesture,
  WorkoutSetRow,
} from '../components/workout-set-row';

jest.mock('@core/theme/theme-context', () => ({
  useTheme: () => ({
    tokens: {
      textMuted: '#6b7280',
    },
  }),
}));

describe('WorkoutSetRow', () => {
  let animatedSpringSpy: jest.SpyInstance;

  beforeEach(() => {
    animatedSpringSpy = jest
      .spyOn(Animated, 'spring')
      .mockReturnValue({ start: jest.fn() } as never);
  });

  afterEach(() => {
    animatedSpringSpy.mockRestore();
  });

  it('wires a capture handler and uses horizontal gesture thresholds for the full row', () => {
    const view = render(
      <WorkoutSetRow
        exerciseName="Bench Press"
        setItem={{
          id: 'set-1',
          exerciseId: 'exercise-1',
          reps: 8,
          weight: 135,
          isCompleted: false,
          targetSets: 3,
          targetReps: 8,
        }}
        index={0}
        onDelete={jest.fn()}
        onUpdateReps={jest.fn()}
        onUpdateWeight={jest.fn()}
        onToggleLogged={jest.fn()}
      />,
    );

    const row = view.UNSAFE_getByType(Animated.View);

    expect(typeof row.props.onMoveShouldSetResponderCapture).toBe('function');
    expect(shouldHandleHorizontalGesture(-24, 2, 0)).toBe(true);
    expect(shouldHandleHorizontalGesture(4, 0, 0)).toBe(false);
    expect(shouldHandleHorizontalGesture(-8, 20, 0)).toBe(false);
    expect(shouldHandleHorizontalGesture(14, 2, -1)).toBe(true);
  });
});
