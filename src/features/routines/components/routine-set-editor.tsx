/**
 * Routine set editor row.
 *
 * CALLING SPEC:
 * - Renders one editable template set row inside a routine exercise card.
 * - Accepts string values so screens can keep incomplete input in local draft
 *   state until save time.
 */

import React from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import { Body, InteractivePressable } from '@shared/components';
import type { RoutineSetDraft } from '../types';

export function RoutineSetEditor({
  draft,
  exerciseName,
  setNumber,
  onChangeTargetReps,
  onChangePlannedWeight,
  onRemove,
}: {
  draft: RoutineSetDraft;
  exerciseName: string;
  setNumber: number;
  onChangeTargetReps: (value: string) => void;
  onChangePlannedWeight: (value: string) => void;
  onRemove: () => void;
}): React.JSX.Element {
  const { tokens } = useTheme();

  return (
    <View className="mb-2.5 overflow-hidden rounded-[16px]">
      <View className="flex-row items-center gap-2 rounded-[16px] bg-surface-elevated px-3 py-3">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-card">
          <Body className="text-sm font-semibold text-foreground">
            {setNumber}
          </Body>
        </View>
        <TextInput
          className="h-11 flex-1 rounded-[12px] bg-surface-card px-3 py-0 font-body text-sm text-foreground"
          value={draft.targetReps}
          onChangeText={onChangeTargetReps}
          keyboardType="number-pad"
          returnKeyType="done"
          accessibilityLabel={`${exerciseName} set ${setNumber} reps`}
          placeholder="Reps"
          placeholderTextColor={tokens.textMuted}
        />
        <TextInput
          className="h-11 flex-1 rounded-[12px] bg-surface-card px-3 py-0 font-body text-sm text-foreground"
          value={draft.plannedWeight}
          onChangeText={onChangePlannedWeight}
          keyboardType="decimal-pad"
          returnKeyType="done"
          accessibilityLabel={`${exerciseName} set ${setNumber} weight`}
          placeholder="Weight"
          placeholderTextColor={tokens.textMuted}
        />
        <InteractivePressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${exerciseName} set ${setNumber}`}
          className="h-11 min-w-[58px] items-center justify-center rounded-[12px] border border-error/40 bg-error/10 px-3"
          onPress={onRemove}
        >
          <Body className="text-sm font-semibold text-error">Drop</Body>
        </InteractivePressable>
      </View>
    </View>
  );
}
