import React from 'react';
import { View } from 'react-native';

import {
  Badge,
  Body,
  ExerciseCard,
  InteractivePressable,
  Input,
  Label,
} from '@shared/components';
import {
  DEFAULT_EXERCISE_TIMER_SECONDS,
  formatTimerDuration,
} from '@shared/utils';
import { RoutineSetEditor } from './routine-set-editor';
import type { RoutineExerciseDraft } from '../types';

export function RoutineExerciseEditor({
  draft,
  exerciseName,
  drag,
  isActive: _isActive,
  onOpenDetails,
  onRemove,
  onOpenRestTimerOptions,
  onAddSet,
  onRemoveSet,
  onChangeSetTargetRepsMin,
  onChangeSetTargetRepsMax,
  onChangeSetPlannedWeight,
  onChangeProgressionPolicy,
  onChangeTargetRir,
}: {
  draft: RoutineExerciseDraft;
  exerciseName: string;
  drag: () => void;
  isActive: boolean;
  onOpenDetails: () => void;
  onRemove: () => void;
  onOpenRestTimerOptions: () => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onChangeSetTargetRepsMin: (setId: string, value: string) => void;
  onChangeSetTargetRepsMax: (setId: string, value: string) => void;
  onChangeSetPlannedWeight: (setId: string, value: string) => void;
  onChangeProgressionPolicy: (
    value: RoutineExerciseDraft['progressionPolicy'],
  ) => void;
  onChangeTargetRir: (value: string) => void;
}): React.JSX.Element {
  const parsedRestSeconds = Number.parseInt(draft.restSeconds, 10);
  const restTimerDisplayLabel = `Timer ${formatTimerDuration(
    Number.isFinite(parsedRestSeconds) && parsedRestSeconds > 0
      ? parsedRestSeconds
      : DEFAULT_EXERCISE_TIMER_SECONDS,
  )}`;

  return (
    <InteractivePressable
      className="mb-3"
      accessibilityRole="button"
      accessibilityLabel={`Reorder ${exerciseName}`}
      delayLongPress={150}
      onLongPress={drag}
    >
      <View>
        <ExerciseCard
          title={exerciseName}
          subtitle={`${draft.sets.length} planned ${
            draft.sets.length === 1 ? 'set' : 'sets'
          }`}
          metaLabel={restTimerDisplayLabel}
          isMetaActive={draft.restSeconds.trim() !== ''}
          onPressMeta={onOpenRestTimerOptions}
          metaAccessibilityLabel={`${exerciseName} timer options`}
          metaAccessibilityHint={`Choose the timer duration for ${exerciseName}. Current setting: ${restTimerDisplayLabel}.`}
          onPressTitle={onOpenDetails}
          titleAccessibilityLabel={`View details for ${exerciseName}`}
          menuActions={[
            {
              label: 'View Details',
              onPress: onOpenDetails,
            },
            {
              label: 'Delete Exercise',
              style: 'destructive',
              onPress: onRemove,
            },
          ]}
        >
          <View className="mb-3 flex-row flex-wrap gap-2 px-1">
            <InteractivePressable
              className={`rounded-[12px] px-3 py-2 ${
                draft.progressionPolicy === 'double_progression'
                  ? 'bg-accent'
                  : 'bg-surface-elevated'
              }`}
              accessibilityRole="button"
              accessibilityLabel={`${exerciseName} double progression policy`}
              onPress={() => onChangeProgressionPolicy('double_progression')}
            >
              <Body
                className={`text-sm font-semibold ${
                  draft.progressionPolicy === 'double_progression'
                    ? 'text-accent-foreground'
                    : 'text-foreground'
                }`}
              >
                Double progression
              </Body>
            </InteractivePressable>
            <InteractivePressable
              className={`rounded-[12px] px-3 py-2 ${
                draft.progressionPolicy === 'top_set_backoff'
                  ? 'bg-accent'
                  : 'bg-surface-elevated'
              }`}
              accessibilityRole="button"
              accessibilityLabel={`${exerciseName} top set backoff policy`}
              onPress={() => onChangeProgressionPolicy('top_set_backoff')}
            >
              <Body
                className={`text-sm font-semibold ${
                  draft.progressionPolicy === 'top_set_backoff'
                    ? 'text-accent-foreground'
                    : 'text-foreground'
                }`}
              >
                Top set + backoff
              </Body>
            </InteractivePressable>
            <View className="min-w-32 flex-1">
              <Input
                value={draft.targetRir}
                onChangeText={onChangeTargetRir}
                keyboardType="decimal-pad"
                placeholder="Target RIR"
                accessibilityLabel={`${exerciseName} target RIR`}
              />
            </View>
          </View>
          <View className="flex-row items-center gap-2 px-1 pb-3 pt-1">
            <Label className="w-8 text-center text-xs">Set</Label>
            <Label className="flex-1 text-xs">Min</Label>
            <Label className="flex-1 text-xs">Max</Label>
            <Label className="flex-1 text-xs">Weight</Label>
            <Label className="w-[58px] text-center text-xs">Drop</Label>
          </View>
          {draft.sets.map((setEntry, index) => (
            <RoutineSetEditor
              key={setEntry.id}
              draft={setEntry}
              exerciseName={exerciseName}
              setNumber={index + 1}
              onChangeTargetRepsMin={(value) =>
                onChangeSetTargetRepsMin(setEntry.id, value)
              }
              onChangeTargetRepsMax={(value) =>
                onChangeSetTargetRepsMax(setEntry.id, value)
              }
              onChangePlannedWeight={(value) =>
                onChangeSetPlannedWeight(setEntry.id, value)
              }
              onRemove={() => onRemoveSet(setEntry.id)}
            />
          ))}

          <View className="mt-1 flex-row justify-end px-1">
            <Badge variant="muted">
              {draft.progressionPolicy === 'top_set_backoff'
                ? 'Set roles auto-map to top set and backoff'
                : 'Logged sets default to work sets'}
            </Badge>
          </View>

          <InteractivePressable
            accessibilityRole="button"
            accessibilityLabel={`Add set to ${exerciseName}`}
            className="mt-1 self-start rounded-[12px] bg-surface-elevated px-3 py-2"
            onPress={onAddSet}
          >
            <Body className="text-sm font-semibold text-secondary">
              Add set
            </Body>
          </InteractivePressable>
        </ExerciseCard>
      </View>
    </InteractivePressable>
  );
}
