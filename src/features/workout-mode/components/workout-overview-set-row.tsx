/**
 * Workout overview set row.
 *
 * CALLING SPEC:
 * - render one set row inside the workout overview modal
 * - supports jump, weight, and reps adjustments
 * - has no side effects beyond invoking callbacks
 */

import React from 'react';
import { Text, View } from 'react-native';

import {
  Body,
  Button,
  Label,
  Surface,
  InteractivePressable,
  Muted,
} from '@shared/components';

function StepButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}): React.JSX.Element {
  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      className="h-11 w-11 items-center justify-center rounded-[16px] border border-surface-border bg-surface-card"
      onPress={onPress}
    >
      <Text className="font-heading text-xl text-foreground">{label}</Text>
    </InteractivePressable>
  );
}

export function WorkoutOverviewSetRow({
  exerciseName,
  setLabel,
  reps,
  weight,
  isCompleted,
  onJump,
  onAdjustReps,
  onAdjustWeight,
}: {
  exerciseName: string;
  setLabel: string;
  reps: number;
  weight: number;
  isCompleted: boolean;
  onJump: () => void;
  onAdjustReps: (delta: number) => void;
  onAdjustWeight: (delta: number) => void;
}): React.JSX.Element {
  return (
    <View className="rounded-[18px] border border-surface-border bg-surface-elevated px-4 py-4">
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Body className="font-semibold">{setLabel}</Body>
          <Muted className="mt-1">{exerciseName}</Muted>
        </View>
        <Button size="sm" variant="secondary" onPress={onJump}>
          Jump
        </Button>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 gap-2">
          <Label>Reps</Label>
          <View className="flex-row items-center gap-2">
            <StepButton label="−" onPress={() => onAdjustReps(-1)} />
            <Surface className="flex-1 items-center rounded-[16px] px-3 py-3">
              <Body className="font-semibold">{reps}</Body>
            </Surface>
            <StepButton label="+" onPress={() => onAdjustReps(1)} />
          </View>
        </View>
        <View className="flex-1 gap-2">
          <Label>Weight</Label>
          <View className="flex-row items-center gap-2">
            <StepButton label="−" onPress={() => onAdjustWeight(-5)} />
            <Surface className="flex-1 items-center rounded-[16px] px-3 py-3">
              <Body className="font-semibold">{weight}</Body>
            </Surface>
            <StepButton label="+" onPress={() => onAdjustWeight(5)} />
          </View>
        </View>
      </View>

      <Muted className="mt-3">{isCompleted ? 'Logged' : 'Pending'}</Muted>
    </View>
  );
}
