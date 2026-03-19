import React from 'react';
import { Pressable, View } from 'react-native';

import { Body, Button, Input, Label, Muted } from '@shared/components';
import type { RoutineExerciseDraft } from '../types';

export function RoutineExerciseEditor({
  draft,
  exerciseName,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangeTargetSets,
  onChangeTargetReps,
}: {
  draft: RoutineExerciseDraft;
  exerciseName: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChangeTargetSets: (value: string) => void;
  onChangeTargetReps: (value: string) => void;
}): React.JSX.Element {
  return (
    <View className="rounded-[20px] border border-surface-border/80 bg-surface-elevated px-4 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Body className="font-medium">{exerciseName}</Body>
          <Muted className="mt-1 text-sm">
            Reorder here before this routine lands in schedules and workouts.
          </Muted>
        </View>

        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move ${exerciseName} up`}
            className={`rounded-[14px] border px-3 py-2 ${
              isFirst
                ? 'border-surface-border/40 opacity-40'
                : 'border-surface-border'
            }`}
            disabled={isFirst}
            onPress={onMoveUp}
          >
            <Label>Up</Label>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move ${exerciseName} down`}
            className={`rounded-[14px] border px-3 py-2 ${
              isLast
                ? 'border-surface-border/40 opacity-40'
                : 'border-surface-border'
            }`}
            disabled={isLast}
            onPress={onMoveDown}
          >
            <Label>Down</Label>
          </Pressable>
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
  );
}
