/**
 * Workout overview set row.
 *
 * CALLING SPEC:
 * - render one compact set row inside the workout overview modal
 * - supports jump and delete actions for a single set
 * - highlights the current set without rendering extra status controls
 * - has no side effects beyond invoking callbacks
 */

import React from 'react';
import { View } from 'react-native';

import { Body, InteractivePressable, Muted } from '@shared/components';

interface WorkoutOverviewSetRowProps {
  setLabel: string;
  reps: number;
  weight: number;
  isCompleted: boolean;
  isCurrent: boolean;
  onJump: () => void;
  onDelete: () => void;
}

export function WorkoutOverviewSetRow({
  setLabel,
  reps,
  weight,
  isCompleted,
  isCurrent,
  onJump,
  onDelete,
}: WorkoutOverviewSetRowProps): React.JSX.Element {
  const rowTestId = `jump-${setLabel.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <View className="flex-row items-center gap-2">
      <InteractivePressable
        testID={rowTestId}
        accessibilityRole="button"
        accessibilityLabel={`Jump to ${setLabel}`}
        className={`flex-1 rounded-[18px] border px-4 py-4 ${
          isCurrent
            ? 'border-accent bg-accent/10'
            : 'border-surface-border bg-surface-elevated'
        }`}
        onPress={onJump}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Body className="font-semibold">{setLabel}</Body>
            <Muted className="mt-1">
              {weight} × {reps}
            </Muted>
          </View>
          <View
            className={`h-2.5 w-2.5 rounded-full ${
              isCompleted ? 'bg-accent' : 'bg-surface-border'
            }`}
          />
        </View>
      </InteractivePressable>

      <InteractivePressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${setLabel}`}
        className="rounded-[16px] border border-surface-border bg-surface-card px-3 py-4"
        onPress={onDelete}
      >
        <Body className="text-sm font-semibold">Delete</Body>
      </InteractivePressable>
    </View>
  );
}
