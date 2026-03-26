/**
 * Focused workout scene.
 *
 * CALLING SPEC:
 * - render one fixed-screen set control surface for active workout logging
 * - keep stack navigation linear by route order with tap-to-move previews
 * - keep editing numeric-input only for weight/reps with commit-on-dismiss semantics
 * - enforce one-active-interaction mode while the numeric editor is open
 * - side effects: invokes optimistic workout actions supplied by the parent
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  Text,
  TextInput,
  unstable_batchedUpdates,
  View,
} from 'react-native';

import { Button, Heading, Label, Muted } from '@shared/components';
import { useReducedMotionPreference } from '@shared/hooks';
import { triggerInteractionFeedback } from '@shared/utils';
import { type SetControlStackPreviewItem } from '../domain/set-control-stack';
import { buildFocusedWorkoutViewModel } from '../domain/focused-session';
import {
  useActiveWorkoutSetControlStack,
  useActiveWorkoutSetSceneState,
  useExerciseTimerState,
} from '../hooks/use-active-workout-state';
import { DEFAULT_EXERCISE_TIMER_SECONDS, useWorkoutStore } from '../store';
import type { PreviousExercisePerformance } from '../types';
import { CompleteSetButton } from './complete-set-button';
import { type HeroValueField } from './focused-set-hero-helpers';
import { WorkoutTimerButtonLabel } from './workout-timer-button-label';
import { Divider } from '@/shared/ui/divider';

type EditMode = HeroValueField | null;

interface FocusedWorkoutSceneProps {
  focusedSetId: string;
  headerHeight: number;
  bottomInset: number;
  previousPerformance: PreviousExercisePerformance | null;
  onOpenOverview: () => void;
  onOpenExerciseDetails: (exerciseId: string) => void;
  onOpenExerciseTimerOptions: (exerciseId: string) => void;
  onMoveFocus: (nextSetId: string | null) => void;
  onCompleteWorkout: () => void;
  updateReps: (setId: string, reps: number) => void;
  updateWeight: (setId: string, weight: number) => void;
  updateActualRir: (setId: string, actualRir: number | null) => void;
  toggleSetLogged: (setId: string, isCompleted: boolean) => void;
}

function buildRirOptions(): Array<number | null> {
  return [null, 0, 1, 2, 3, 4];
}

function formatSetValue(weight: number, reps: number): string {
  return `${weight} x ${reps}`;
}

function getDirectionArrow(direction: 'previous' | 'next'): string {
  return direction === 'previous' ? '↑' : '↓';
}

function StackPreviewRow({
  preview,
  direction,
  onPress,
  disabled = false,
  className = '',
}: {
  preview: SetControlStackPreviewItem | null;
  direction: 'previous' | 'next';
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}): React.JSX.Element {
  const rowClassName = `min-h-16 items-center justify-center px-4 py-2 ${className}`;
  if (!preview) {
    return (
      <View
        testID={`stack-preview-${direction}-empty`}
        className={rowClassName}
      ></View>
    );
  }

  const rowBody =
    preview.kind === 'local' ? (
      <Label className="text-2xl">
        {getDirectionArrow(direction)}{' '}
        {formatSetValue(preview.weight, preview.reps)}
        {preview.isCompleted ? ' ✓' : ''}
      </Label>
    ) : (
      <View className="w-full items-center justify-center gap-2">
        {direction === 'next' ? <Divider></Divider> : <View className="h-px" />}
        <Label className="text-2xl">
          {getDirectionArrow(direction)} {preview.exerciseName} {'·'}{' '}
          {preview.setNumber}/{preview.totalSetsForExercise}
        </Label>
        {direction === 'previous' ? (
          <Divider></Divider>
        ) : (
          <View className="h-px" />
        )}
      </View>
    );

  const rowTestId =
    preview.kind === 'local'
      ? `stack-preview-${direction}-local`
      : `stack-preview-${direction}-transition`;

  return (
    <Pressable
      testID={rowTestId}
      accessibilityRole="button"
      accessibilityLabel={`Focus ${direction} set`}
      disabled={disabled}
      onPress={onPress}
      className={rowClassName}
      style={{ opacity: disabled ? 0.35 : 0.5, transform: [{ scale: 0.95 }] }}
    >
      {rowBody}
    </Pressable>
  );
}

export function FocusedWorkoutScene({
  focusedSetId,
  headerHeight,
  bottomInset,
  previousPerformance,
  onOpenOverview,
  onOpenExerciseDetails,
  onOpenExerciseTimerOptions,
  onMoveFocus,
  onCompleteWorkout,
  updateReps,
  updateWeight,
  updateActualRir,
  toggleSetLogged,
}: FocusedWorkoutSceneProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotionPreference();
  const sceneState = useActiveWorkoutSetSceneState(focusedSetId);
  const stackState = useActiveWorkoutSetControlStack(focusedSetId);
  const startRestTimer = useWorkoutStore((state) => state.startRestTimer);
  const clearRestTimer = useWorkoutStore((state) => state.clearRestTimer);
  const startExerciseTimer = useWorkoutStore(
    (state) => state.startExerciseTimer,
  );
  const { restTimerEndsAt, exerciseTimerEndsAt, exerciseTimerDuration } =
    useExerciseTimerState(sceneState?.exerciseId ?? '');

  const completionPulse = useRef(new Animated.Value(1)).current;
  const morphScale = useRef(new Animated.Value(1)).current;
  const morphOpacity = useRef(new Animated.Value(1)).current;
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [draftWeight, setDraftWeight] = useState(sceneState?.set.weight ?? 0);
  const [draftReps, setDraftReps] = useState(sceneState?.set.reps ?? 0);
  const [isCompletingTransition, setIsCompletingTransition] = useState(false);
  const isEditModeActive = editMode !== null;
  const currentSetId = sceneState?.set.id ?? null;
  const currentWeight = sceneState?.set.weight ?? 0;
  const currentReps = sceneState?.set.reps ?? 0;

  useEffect(() => {
    if (isEditModeActive || currentSetId === null) {
      return;
    }

    setDraftWeight(currentWeight);
    setDraftReps(currentReps);
  }, [currentReps, currentSetId, currentWeight, isEditModeActive]);

  useEffect(() => {
    if (currentSetId === null) {
      return;
    }

    if (prefersReducedMotion) {
      morphScale.setValue(1);
      morphOpacity.setValue(1);
      return;
    }

    morphScale.setValue(0.94);
    morphOpacity.setValue(0.7);

    Animated.parallel([
      Animated.timing(morphScale, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
      Animated.timing(morphOpacity, {
        toValue: 1,
        duration: 190,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    currentSetId,
    focusedSetId,
    morphOpacity,
    morphScale,
    prefersReducedMotion,
  ]);

  if (sceneState === null || stackState === null) {
    return <View className="flex-1" />;
  }

  const previousSetId = stackState.previousSetId;
  const nextSetId = stackState.nextSetId;

  const canNavigatePrevious = previousSetId !== null;
  const canNavigateNext = nextSetId !== null;
  const controlsDisabled = isEditModeActive || isCompletingTransition;

  const selectedWeight = isEditModeActive ? draftWeight : sceneState.set.weight;
  const selectedReps = isEditModeActive ? draftReps : sceneState.set.reps;

  const sceneViewModel = buildFocusedWorkoutViewModel({
    exercise: {
      exerciseId: sceneState.exerciseId,
      exerciseName: sceneState.exerciseName,
      targetReps: sceneState.set.targetReps ?? null,
      targetRepsMin: sceneState.set.targetRepsMin ?? null,
      targetRepsMax: sceneState.set.targetRepsMax ?? null,
    },
    set: sceneState.set,
    setNumber: sceneState.setNumber,
    totalSetsForExercise: sceneState.totalSetsForExercise,
    totalRemainingSets: sceneState.totalRemainingSets,
    selectedReps,
    selectedWeight,
    selectedRir: sceneState.set.actualRir ?? null,
    previousPerformance,
  });

  const dismissEditMode = (): void => {
    if (editMode === null) {
      return;
    }

    if (editMode === 'weight') {
      const nextWeight = Math.max(0, draftWeight);
      if (nextWeight !== sceneState.set.weight) {
        updateWeight(sceneState.set.id, nextWeight);
      }
    }

    if (editMode === 'reps') {
      const nextReps = Math.round(Math.max(0, draftReps));
      if (nextReps !== sceneState.set.reps) {
        updateReps(sceneState.set.id, nextReps);
      }
    }

    triggerInteractionFeedback('set-adjust');
    setEditMode(null);
  };

  const animateMoveToSet = (targetSetId: string | null): void => {
    if (!targetSetId) {
      onCompleteWorkout();
      return;
    }

    onMoveFocus(targetSetId);
  };

  const handleMoveToPreviousSet = (): void => {
    if (controlsDisabled) {
      return;
    }

    if (!canNavigatePrevious) {
      return;
    }

    animateMoveToSet(previousSetId);
  };

  const handleMoveToNextSet = (): void => {
    if (controlsDisabled) {
      return;
    }

    if (!canNavigateNext) {
      return;
    }

    animateMoveToSet(nextSetId);
  };

  const handleAdjustRir = (nextRir: number | null): void => {
    if (controlsDisabled) {
      return;
    }

    if ((sceneState.set.actualRir ?? null) !== nextRir) {
      updateActualRir(sceneState.set.id, nextRir);
    }

    triggerInteractionFeedback('set-adjust');
  };

  const handleCompleteSet = (): void => {
    if (controlsDisabled) {
      return;
    }

    const didLogSet = !sceneState.set.isCompleted;

    if (didLogSet) {
      unstable_batchedUpdates(() => {
        toggleSetLogged(sceneState.set.id, true);
        startExerciseTimer(sceneState.exerciseId, exerciseTimerDuration);
      });
      triggerInteractionFeedback('set-log');
    }

    if (prefersReducedMotion) {
      if (nextSetId === null) {
        onCompleteWorkout();
      } else {
        onMoveFocus(nextSetId);
      }
      return;
    }

    setIsCompletingTransition(true);
    Animated.sequence([
      Animated.timing(completionPulse, {
        toValue: 1.06,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(completionPulse, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (nextSetId === null) {
        onCompleteWorkout();
      } else {
        animateMoveToSet(nextSetId);
      }
      setIsCompletingTransition(false);
    });
  };

  const handleNumberInputChange = (
    field: HeroValueField,
    text: string,
  ): void => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    const nextValue = digitsOnly.length > 0 ? Number(digitsOnly) : 0;

    if (field === 'weight') {
      setDraftWeight(nextValue);
      return;
    }

    setDraftReps(nextValue);
  };

  const currentSetLabel = `Set ${sceneViewModel.setNumber} of ${sceneViewModel.totalSetsForExercise}`;
  const setCountLabel =
    sceneViewModel.totalRemainingSets > 0
      ? `${sceneViewModel.totalRemainingSets} sets left`
      : 'Final set';

  return (
    <View
      testID="focused-workout-scene"
      className="flex-1"
      style={{
        paddingTop: headerHeight + 16,
        paddingBottom: bottomInset + 32,
      }}
    >
      <View className="flex-1 justify-between">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Heading className="text-3xl text-foreground">
              {sceneViewModel.exerciseName}
            </Heading>
            <Muted className="mt-1 text-base text-muted">
              {currentSetLabel}
              {' · '}
              {setCountLabel}
            </Muted>
          </View>
          <Button
            size="sm"
            variant="ghost"
            onPress={onOpenOverview}
            disabled={controlsDisabled}
          >
            Overview
          </Button>
        </View>

        <Animated.View
          testID="set-control-stack"
          className="flex-1 justify-center gap-2"
        >
          <StackPreviewRow
            preview={stackState.previous}
            direction="previous"
            onPress={handleMoveToPreviousSet}
            disabled={controlsDisabled || !canNavigatePrevious}
          />

          <Animated.View
            testID="set-control-current"
            className="w-full flex-row items-center justify-center gap-2"
            style={{
              opacity: morphOpacity,
              transform: [
                {
                  scale: Animated.multiply(completionPulse, morphScale),
                },
              ],
              zIndex: isEditModeActive ? 40 : 1,
              elevation: isEditModeActive ? 40 : 1,
            }}
          >
            <View className="min-w-0 flex-1 items-center">
              <TextInput
                testID="active-set-weight-input"
                value={String(draftWeight)}
                onChangeText={(text) => {
                  handleNumberInputChange('weight', text);
                }}
                keyboardType="number-pad"
                autoFocus
                className="w-full text-7xl text-foreground p-0 m-0 text-center"
                style={{
                  fontWeight: '700',
                  lineHeight: 0,
                }}
              />

              <Label>lbs</Label>
            </View>
            <Heading className="px-2 text-3xl text-foreground">×</Heading>
            <View className="min-w-0 flex-1 items-center">
              <TextInput
                testID="active-set-reps-input"
                value={String(draftReps)}
                onChangeText={(text) => {
                  handleNumberInputChange('reps', text);
                }}
                keyboardType="number-pad"
                autoFocus
                selection={{
                  start: String(draftReps).length,
                  end: String(draftReps).length,
                }}
                className="w-full text-7xl text-foreground p-0 m-0 text-center"
                style={{
                  fontWeight: '700',
                  lineHeight: 0,
                }}
              />
              <Label>reps</Label>
            </View>
          </Animated.View>

          <StackPreviewRow
            preview={stackState.next}
            direction="next"
            onPress={handleMoveToNextSet}
            disabled={controlsDisabled || !canNavigateNext}
          />
        </Animated.View>

        <View className="pt-4">
          <View className="gap-4">
            <View>
              <Label>RIR</Label>
              <View className="mt-2 flex-row flex-wrap items-center gap-3">
                {buildRirOptions().map((value) => {
                  const isSelected =
                    (sceneState.set.actualRir ?? null) === value;

                  return (
                    <Pressable
                      key={value === null ? 'skip' : String(value)}
                      accessibilityRole="button"
                      accessibilityLabel={`Set RIR to ${value === null ? 'skip' : String(value)}`}
                      accessibilityState={{ disabled: controlsDisabled }}
                      onPress={() => handleAdjustRir(value)}
                      disabled={controlsDisabled}
                      className={`h-8 min-w-10 items-center justify-center rounded-full px-4 ${isSelected ? 'bg-accent' : 'bg-surface-card border border-surface-border'}`}
                      style={{ opacity: isSelected ? 1 : 0.55 }}
                    >
                      <Text
                        className={
                          isSelected
                            ? 'font-body text-accent-foreground'
                            : 'font-body text-foreground'
                        }
                      >
                        {value === null ? 'Skip' : String(value)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="items-start">
              <Label>Target: {sceneViewModel.guidance.targetLabel}</Label>
              <Muted> {sceneViewModel.guidance.text} </Muted>
            </View>

            <View className="flex-row gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-10 flex-1 opacity-75"
                onPress={() => {
                  if (controlsDisabled) {
                    return;
                  }

                  if (
                    restTimerEndsAt !== null &&
                    restTimerEndsAt > Date.now()
                  ) {
                    clearRestTimer();
                    return;
                  }

                  startRestTimer();
                  onOpenExerciseTimerOptions(sceneViewModel.exerciseId);
                }}
                disabled={controlsDisabled}
              >
                <WorkoutTimerButtonLabel
                  restTimerEndsAt={restTimerEndsAt}
                  exerciseTimerEndsAt={exerciseTimerEndsAt}
                  exerciseTimerDuration={
                    exerciseTimerDuration ?? DEFAULT_EXERCISE_TIMER_SECONDS
                  }
                />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-10 flex-1 opacity-75"
                onPress={() => onOpenExerciseDetails(sceneViewModel.exerciseId)}
                disabled={controlsDisabled}
              >
                Notes
              </Button>
            </View>

            <CompleteSetButton
              label={
                sceneViewModel.totalRemainingSets === 0 &&
                sceneViewModel.isCompleted
                  ? 'Finish Workout'
                  : 'Complete Set'
              }
              onPress={
                sceneViewModel.totalRemainingSets === 0 &&
                sceneViewModel.isCompleted
                  ? onCompleteWorkout
                  : handleCompleteSet
              }
              disabled={controlsDisabled}
            />
          </View>
        </View>
      </View>

      {isEditModeActive ? (
        <Pressable
          testID="active-set-edit-overlay"
          className="absolute inset-y-0 -left-4 -right-4"
          style={{ zIndex: 30 }}
          onPress={dismissEditMode}
        />
      ) : null}
    </View>
  );
}
