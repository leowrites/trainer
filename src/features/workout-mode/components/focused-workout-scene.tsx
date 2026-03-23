/**
 * Focused workout scene.
 *
 * CALLING SPEC:
 * - render one focused-set scene inside the workout pager
 * - owns only scene presentation for a single route location
 * - derives route-local summaries and forwards user actions upstream
 * - has no persistence side effects on its own
 */

import React from 'react';
import { Alert, ScrollView, View } from 'react-native';

import {
  Body,
  Button,
  Heading,
  InteractivePressable,
  Label,
  Muted,
  Surface,
} from '@shared/components';
import { DEFAULT_EXERCISE_TIMER_SECONDS } from '../store';
import {
  buildFocusedWorkoutViewModel,
  getNextFocusedLocation,
} from '../domain/focused-session';
import type {
  ActiveWorkoutSession,
  FocusedWorkoutLocation,
  PreviousExercisePerformance,
} from '../types';
import { FocusedSetHero } from './focused-set-hero';
import {
  formatPreviousPerformance,
  formatRestCountdown,
  formatTimerDuration,
} from '../utils/formatters';

interface FocusedWorkoutSceneProps {
  activeSession: ActiveWorkoutSession;
  routeLocation: FocusedWorkoutLocation;
  currentLocation: FocusedWorkoutLocation;
  now: number;
  headerHeight: number;
  bottomInset: number;
  restLabel: string | null;
  startRestTimer: () => void;
  clearRestTimer: () => void;
  selectedReps: number;
  selectedWeight: number;
  selectedRir: number | null;
  completionRewardToken: number;
  previousPerformanceByExerciseId: Record<
    string,
    PreviousExercisePerformance | null
  >;
  exerciseTimerEndsAtByExerciseId: Record<string, number | null>;
  exerciseTimerDurationByExerciseId: Record<string, number>;
  onOpenOverview: () => void;
  onOpenExerciseDetails: (exerciseId: string) => void;
  onOpenExerciseTimerOptions: (exerciseId: string) => void;
  onMoveFocus: (nextLocation: FocusedWorkoutLocation) => void;
  onPreviewWeight: (value: number) => void;
  onCommitWeight: (value: number) => void;
  onPreviewReps: (value: number) => void;
  onCommitReps: (value: number) => void;
  onAdjustRir: (nextRir: number | null) => void;
}

function buildRirOptions(): Array<number | null> {
  return [null, 0, 1, 2, 3, 4];
}

export function FocusedWorkoutScene({
  activeSession,
  routeLocation,
  currentLocation,
  now,
  headerHeight,
  bottomInset,
  restLabel,
  startRestTimer,
  clearRestTimer,
  selectedReps,
  selectedWeight,
  selectedRir,
  completionRewardToken,
  previousPerformanceByExerciseId,
  exerciseTimerEndsAtByExerciseId,
  exerciseTimerDurationByExerciseId,
  onOpenOverview,
  onOpenExerciseDetails,
  onOpenExerciseTimerOptions,
  onMoveFocus,
  onPreviewWeight,
  onCommitWeight,
  onPreviewReps,
  onCommitReps,
  onAdjustRir,
}: FocusedWorkoutSceneProps): React.JSX.Element {
  const routeExercise = activeSession.exercises[routeLocation.exerciseIndex];
  const routeSet = routeExercise?.sets[routeLocation.setIndex];

  if (!routeExercise || !routeSet) {
    return <View className="flex-1" />;
  }

  const isFocusedRoute =
    routeLocation.exerciseIndex === currentLocation.exerciseIndex &&
    routeLocation.setIndex === currentLocation.setIndex;
  const sceneReps = isFocusedRoute
    ? selectedReps
    : (routeSet.reps ?? routeExercise.targetRepsMin ?? 0);
  const sceneWeight = isFocusedRoute ? selectedWeight : (routeSet.weight ?? 0);
  const sceneRir = isFocusedRoute ? selectedRir : (routeSet.actualRir ?? null);
  const sceneViewModel = buildFocusedWorkoutViewModel({
    session: activeSession,
    location: routeLocation,
    selectedReps: sceneReps,
    selectedRir: sceneRir,
    previousPerformance:
      previousPerformanceByExerciseId[routeExercise.exerciseId] ?? null,
  });
  const timerEndsAt =
    exerciseTimerEndsAtByExerciseId[sceneViewModel.exerciseId] ?? null;
  const sceneRestTimerLabel =
    timerEndsAt !== null && timerEndsAt > now
      ? formatRestCountdown(timerEndsAt - now)
      : formatTimerDuration(
          exerciseTimerDurationByExerciseId[sceneViewModel.exerciseId] ??
            DEFAULT_EXERCISE_TIMER_SECONDS,
        );
  const sceneNextLocation = getNextFocusedLocation(
    activeSession,
    routeLocation,
  );

  return (
    <View
      testID={isFocusedRoute ? 'focused-workout-scene' : undefined}
      className="flex-1"
      pointerEvents={isFocusedRoute ? 'auto' : 'none'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{
          paddingTop: headerHeight + 10,
          paddingBottom: bottomInset + 112,
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
            weightValue={sceneWeight}
            repsValue={sceneReps}
            rewardToken={completionRewardToken}
            previousSetSummary={formatPreviousPerformance(
              previousPerformanceByExerciseId[sceneViewModel.exerciseId] ??
                null,
            )}
            onPreviewWeight={onPreviewWeight}
            onCommitWeight={onCommitWeight}
            onPreviewReps={onPreviewReps}
            onCommitReps={onCommitReps}
          />

          <Surface className="rounded-[24px]">
            <View className="flex-row items-center justify-between gap-3">
              <Heading className="text-2xl">RIR</Heading>
            </View>
            <View className="mt-4 flex-row gap-2">
              {buildRirOptions().map((value) => {
                const isSelected = sceneRir === value;

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
                    onPress={() => onAdjustRir(value)}
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
              onPress={() => onMoveFocus(sceneNextLocation)}
            >
              Skip
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
                if (restLabel) {
                  clearRestTimer();
                  return;
                }

                startRestTimer();
                onOpenExerciseTimerOptions(sceneViewModel.exerciseId);
              }}
            >
              {restLabel ? `Rest ${restLabel}` : `Timer ${sceneRestTimerLabel}`}
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
    </View>
  );
}
