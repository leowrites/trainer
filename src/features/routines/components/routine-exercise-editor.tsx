import React from 'react';
import { View } from 'react-native';

import {
  Body,
  Button,
  Input,
  InteractivePressable,
  Label,
} from '@shared/components';
import type { RoutineExerciseDraft } from '../types';

export function RoutineExerciseEditor({
  draft,
  exerciseName,
  drag,
  isActive,
  onRemove,
  onChangeTargetSets,
  onChangeTargetReps,
}: {
  draft: RoutineExerciseDraft;
  exerciseName: string;
  drag: () => void;
  isActive: boolean;
  onRemove: () => void;
  onChangeTargetSets: (value: string) => void;
  onChangeTargetReps: (value: string) => void;
}): React.JSX.Element {
  return (
    <InteractivePressable
      className="mb-3"
      accessibilityRole="button"
      accessibilityLabel={`Reorder ${exerciseName}`}
      delayLongPress={150}
      onLongPress={drag}
    >
      <View
        className={`rounded-[20px] border px-4 py-4 ${
          isActive
            ? 'border-accent/60 bg-surface-card'
            : 'border-surface-border/80 bg-surface-elevated'
        }`}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Body className="font-medium">{exerciseName}</Body>
          </View>
        </View>

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <Label>Sets</Label>
            <Input
              className="mt-2"
              value={draft.targetSets}
              onChangeText={onChangeTargetSets}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <Label>Reps</Label>
            <Input
              className="mt-2"
              value={draft.targetReps}
              onChangeText={onChangeTargetReps}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Button variant="ghost" className="mt-4 w-full" onPress={onRemove}>
          Remove Exercise
        </Button>
      </View>
    </InteractivePressable>
  );
}
