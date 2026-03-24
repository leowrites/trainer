/**
 * Focused workout scene.
 *
 * CALLING SPEC:
 * - render one focused set without pager infrastructure
 * - own only draft state and explicit previous/next/skip navigation for the current set
 * - subscribe only to the current focused set and its timer state
 * - side effects: invokes optimistic workout actions supplied by the parent
 */

import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, View, unstable_batchedUpdates } from 'react-native';

import {
  Body,
  Button,
  Heading,
  InteractivePressable,
  Label,
  Muted,
  Surface,
} from '@shared/components';
import { triggerInteractionFeedback } from '@shared/utils';
import { buildFocusedWorkoutViewModel } from '../domain/focused-session';
import {
  useActiveWorkoutSetSceneState,
  useExerciseTimerState,
} from '../hooks/use-active-workout-state';
import { DEFAULT_EXERCISE_TIMER_SECONDS, useWorkoutStore } from '../store';
import type { PreviousExercisePerformance } from '../types';
import { formatPreviousPerformance } from '../utils/formatters';
import { CompleteSetButton } from './complete-set-button';
import { FocusedSetHero } from './focused-set-hero';
import { WorkoutTimerButtonLabel } from './workout-timer-button-label';

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

interface FocusedSetDraft {
  reps: number;
  weight: number;
}

function buildRirOptions(): Array<number | null> {
  return [null, 0, 1, 2, 3, 4];
}

function clampNumber(value: number, minimum = 0): number {
  return Math.max(minimum, value);
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
  const sceneState = useActiveWorkoutSetSceneState(focusedSetId);
  const startRestTimer = useWorkoutStore((state) => state.startRestTimer);
  const clearRestTimer = useWorkoutStore((state) => state.clearRestTimer);
  const startExerciseTimer = useWorkoutStore(
    (state) => state.startExerciseTimer,
  );
  const { restTimerEndsAt, exerciseTimerEndsAt, exerciseTimerDuration } =
    useExerciseTimerState(sceneState?.exerciseId ?? '');
  const currentSet = sceneState?.set ?? null;
  const [draftBySetId, setDraftBySetId] = useState<
    Record<string, FocusedSetDraft>
  >({});
  const currentDraft =
    currentSet === null ? null : (draftBySetId[currentSet.id] ?? null);
  const selectedReps = currentDraft?.reps ?? currentSet?.reps ?? 0;
  const selectedWeight = currentDraft?.weight ?? currentSet?.weight ?? 0;

  const sceneViewModel = useMemo(() => {
    if (sceneState === null) {
      return null;
    }

    return buildFocusedWorkoutViewModel({
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
  }, [previousPerformance, sceneState, selectedReps, selectedWeight]);

  if (sceneState === null || sceneViewModel === null) {
    return <View className="flex-1" />;
  }

  const updateDraft = (changes: Partial<FocusedSetDraft>): void => {
    setDraftBySetId((currentDraftState) => {
      const existingDraft = currentDraftState[sceneState.set.id] ?? {
        reps: sceneState.set.reps,
        weight: sceneState.set.weight,
      };
      const nextDraft = {
        ...existingDraft,
        ...changes,
      };

      if (
        nextDraft.reps === sceneState.set.reps &&
        nextDraft.weight === sceneState.set.weight
      ) {
        if (!(sceneState.set.id in currentDraftState)) {
          return currentDraftState;
        }

        const { [sceneState.set.id]: _removedDraft, ...remainingDrafts } =
          currentDraftState;
        return remainingDrafts;
      }

      return {
        ...currentDraftState,
        [sceneState.set.id]: nextDraft,
      };
    });
  };

  const clearDraft = (setId: string): void => {
    setDraftBySetId((currentDraftState) => {
      if (!(setId in currentDraftState)) {
        return currentDraftState;
      }

      const { [setId]: _removedDraft, ...remainingDrafts } = currentDraftState;
      return remainingDrafts;
    });
  };

  const handlePreviewReps = (nextReps: number): void => {
    updateDraft({ reps: clampNumber(nextReps) });
  };

  const handlePreviewWeight = (nextWeight: number): void => {
    updateDraft({ weight: clampNumber(nextWeight) });
  };

  const handleAdjustReps = (
    nextReps: number,
    options?: { feedback?: boolean },
  ): void => {
    const normalizedReps = clampNumber(nextReps);
    updateDraft({ reps: normalizedReps });

    if (normalizedReps !== sceneState.set.reps) {
      updateReps(sceneState.set.id, normalizedReps);
    } else {
      clearDraft(sceneState.set.id);
    }

    if (options?.feedback !== false) {
      triggerInteractionFeedback('set-adjust');
    }
  };

  const handleAdjustWeight = (
    nextWeight: number,
    options?: { feedback?: boolean },
  ): void => {
    const normalizedWeight = clampNumber(nextWeight);
    updateDraft({ weight: normalizedWeight });

    if (normalizedWeight !== sceneState.set.weight) {
      updateWeight(sceneState.set.id, normalizedWeight);
    } else {
      clearDraft(sceneState.set.id);
    }

    if (options?.feedback !== false) {
      triggerInteractionFeedback('set-adjust');
    }
  };

  const commitFocusedSetValues = (): void => {
    if (selectedReps !== sceneState.set.reps) {
      updateReps(sceneState.set.id, selectedReps);
    }

    if (selectedWeight !== sceneState.set.weight) {
      updateWeight(sceneState.set.id, selectedWeight);
    }

    if (currentDraft !== null) {
      clearDraft(sceneState.set.id);
    }
  };

  const handleAdjustRir = (nextRir: number | null): void => {
    if (currentDraft !== null) {
      commitFocusedSetValues();
    }

    if ((sceneState.set.actualRir ?? null) !== nextRir) {
      updateActualRir(sceneState.set.id, nextRir);
    }

    triggerInteractionFeedback('set-adjust');
  };

  const handleMoveToPreviousSet = (): void => {
    if (sceneState.previousSetId === null) {
      return;
    }

    commitFocusedSetValues();
    onMoveFocus(sceneState.previousSetId);
  };

  const handleMoveToNextSet = (): void => {
    if (
      sceneState.nextSetId === null ||
      sceneState.nextSetId === sceneState.set.id
    ) {
      return;
    }

    commitFocusedSetValues();
    onMoveFocus(sceneState.nextSetId);
  };

  const handleAdvanceAfterCompletion = (): void => {
    if (
      sceneState.nextSetId === null ||
      sceneState.nextSetId === sceneState.set.id
    ) {
      onCompleteWorkout();
      return;
    }

    onMoveFocus(sceneState.nextSetId);
  };

  const handleCompleteSet = (): void => {
    commitFocusedSetValues();

    const didLogSet = !sceneState.set.isCompleted;

    if (didLogSet) {
      unstable_batchedUpdates(() => {
        toggleSetLogged(sceneState.set.id, true);
        startExerciseTimer(sceneState.exerciseId, exerciseTimerDuration);
        handleAdvanceAfterCompletion();
      });
      triggerInteractionFeedback('set-log');
      return;
    }

    handleAdvanceAfterCompletion();
  };

  const hasPreviousSet = sceneState.previousSetId !== null;
  const hasNextSet =
    sceneState.nextSetId !== null && sceneState.nextSetId !== sceneState.set.id;

  return (
    <View testID="focused-workout-scene" className="flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{
          paddingTop: headerHeight + 10,
          paddingBottom: bottomInset + 132,
          gap: 14,
        }}
      >
        <View className="gap-3 px-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Heading className="mt-2 text-3xl">
                {sceneViewModel.exerciseName}
              </Heading>
              <Muted className="mt-2">
                Set {sceneViewModel.setNumber} of{' '}
                {sceneViewModel.totalSetsForExercise}
                {sceneViewModel.totalRemainingSets > 0
                  ? ` · ${sceneViewModel.totalRemainingSets} total sets left`
                  : ' · Last set'}
              </Muted>
            </View>

            <Button size="sm" variant="secondary" onPress={onOpenOverview}>
              Overview
            </Button>
          </View>

          <FocusedSetHero
            weightValue={selectedWeight}
            repsValue={selectedReps}
            previousSetSummary={formatPreviousPerformance(previousPerformance)}
            onPreviewWeight={handlePreviewWeight}
            onCommitWeight={(nextWeight) =>
              handleAdjustWeight(nextWeight, { feedback: false })
            }
            onPreviewReps={handlePreviewReps}
            onCommitReps={(nextReps) =>
              handleAdjustReps(nextReps, { feedback: false })
            }
          />

          <Surface className="rounded-[24px]">
            <View className="flex-row items-center justify-between gap-3">
              <Heading className="text-2xl">RIR</Heading>
            </View>
            <View className="mt-4 flex-row gap-2">
              {buildRirOptions().map((value) => {
                const isSelected = (sceneState.set.actualRir ?? null) === value;

                return (
                  <InteractivePressable
                    key={value === null ? 'skip' : String(value)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      value === null ? 'Skip RIR' : `Set RIR to ${value}`
                    }
                    className={`min-w-0 flex-1 items-center rounded-[14px] px-2 py-3 ${
                      isSelected ? 'bg-accent' : 'bg-surface-elevated'
                    }`}
                    onPress={() => handleAdjustRir(value)}
                  >
                    <Body
                      className={`text-center font-semibold ${
                        isSelected
                          ? 'text-accent-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {value === null ? 'Skip' : value}
                    </Body>
                  </InteractivePressable>
                );
              })}
            </View>
          </Surface>

          <Surface className="py-4">
            <Heading className="mt-2">
              {`Target: ${sceneViewModel.guidance.targetLabel}`}
            </Heading>
            <Label className="text-xl">{sceneViewModel.guidance.text}</Label>
          </Surface>

          <View className="flex-row flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={handleMoveToPreviousSet}
              disabled={!hasPreviousSet}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={handleMoveToNextSet}
              disabled={!hasNextSet}
            >
              Skip
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={handleMoveToNextSet}
              disabled={!hasNextSet}
            >
              Next
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => onOpenExerciseDetails(sceneViewModel.exerciseId)}
            >
              Detail
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                if (restTimerEndsAt !== null && restTimerEndsAt > Date.now()) {
                  clearRestTimer();
                  return;
                }

                startRestTimer();
                onOpenExerciseTimerOptions(sceneViewModel.exerciseId);
              }}
            >
              <WorkoutTimerButtonLabel
                restTimerEndsAt={restTimerEndsAt}
                exerciseTimerEndsAt={exerciseTimerEndsAt}
                exerciseTimerDuration={
                  exerciseTimerDuration ?? DEFAULT_EXERCISE_TIMER_SECONDS
                }
              />
            </Button>
            <Button size="sm" variant="secondary" onPress={onOpenOverview}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() =>
                Alert.alert(
                  'Notes',
                  'Set notes are not available in this pass.',
                )
              }
            >
              Notes
            </Button>
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 pb-2"
        style={{ paddingBottom: Math.max(bottomInset, 8) }}
      >
        <View className="mx-4 flex-row items-center gap-2 rounded-[24px] border border-surface-border bg-surface-card p-2">
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
          />
        </View>
      </View>
    </View>
  );
}
