import { useHeaderHeight } from '@react-navigation/elements';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Container, Label, Muted } from '@shared/components';
import type { useActiveWorkout } from '../hooks/use-active-workout';
import { DEFAULT_EXERCISE_TIMER_SECONDS } from '../store';
import type { PreviousExercisePerformance } from '../types';
import { ExerciseCard } from './exercise-card';
import { ExercisePickerBottomSheet } from './exercise-picker-bottom-sheet';
import { WorkoutSetRow } from './workout-set-row';
import {
  formatPreviousPerformance,
  formatRestCountdown,
  formatTimerDuration,
} from '../utils/formatters';

export interface ActiveWorkoutContentProps {
  activeSession: NonNullable<
    ReturnType<typeof useActiveWorkout>['activeSession']
  >;
  now: number;
  setCount: number;
  volume: number;
  restLabel: string | null;
  onComplete: () => void;
  onDeleteWorkout: () => void;
  startRestTimer: (durationSeconds?: number) => void;
  clearRestTimer: () => void;
  onOpenExerciseDetails: (exerciseId: string) => void;
  onOpenExerciseTimerOptions: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  addExercise: (exerciseId: string, exerciseName: string) => void;
  removeExercise: (exerciseId: string) => void;
  deleteSet: (setId: string) => void;
  updateReps: (setId: string, reps: number) => void;
  updateWeight: (setId: string, weight: number) => void;
  toggleSetLogged: (
    exerciseId: string,
    setId: string,
    isCompleted: boolean,
  ) => void;
  exerciseTimerEndsAtByExerciseId: Record<string, number | null>;
  exerciseTimerDurationByExerciseId: Record<string, number>;
  previousPerformanceByExerciseId: Record<
    string,
    PreviousExercisePerformance | null
  >;
  showExerciseSheet: boolean;
  setShowExerciseSheet: React.Dispatch<React.SetStateAction<boolean>>;
  insets: ReturnType<typeof useSafeAreaInsets>;
}

export function ActiveWorkoutContent({
  activeSession,
  now,
  onComplete,
  onDeleteWorkout,
  onOpenExerciseDetails,
  onOpenExerciseTimerOptions,
  addSet,
  addExercise,
  removeExercise,
  deleteSet,
  updateReps,
  updateWeight,
  toggleSetLogged,
  exerciseTimerEndsAtByExerciseId,
  exerciseTimerDurationByExerciseId,
  previousPerformanceByExerciseId,
  showExerciseSheet,
  setShowExerciseSheet,
  insets,
}: ActiveWorkoutContentProps): React.JSX.Element {
  const headerHeight = useHeaderHeight();
  const dockOffset = Math.max(insets.bottom, 2);
  const dockHeight = 70 + dockOffset;

  return (
    <Container
      className="px-0 pb-0"
      style={{ paddingBottom: 0 }}
      edges={['left', 'right']}
    >
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={{
            paddingTop: headerHeight + 8,
            paddingBottom: dockHeight + 8,
          }}
        >
          {activeSession.exercises.length > 0 ? (
            activeSession.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.exerciseId}
                title={exercise.exerciseName}
                exerciseId={exercise.exerciseId}
                previousPerformanceLabel={formatPreviousPerformance(
                  previousPerformanceByExerciseId[exercise.exerciseId] ?? null,
                )}
                isExerciseTimerActive={
                  (exerciseTimerEndsAtByExerciseId[exercise.exerciseId] ?? 0) >
                  now
                }
                exerciseTimerDisplayLabel={
                  (exerciseTimerEndsAtByExerciseId[exercise.exerciseId] ?? 0) >
                  now
                    ? `Timer ${formatRestCountdown(
                        (exerciseTimerEndsAtByExerciseId[exercise.exerciseId] ??
                          0) - now,
                      )}`
                    : `Timer ${formatTimerDuration(
                        exerciseTimerDurationByExerciseId[
                          exercise.exerciseId
                        ] ?? DEFAULT_EXERCISE_TIMER_SECONDS,
                      )}`
                }
                onOpenDetails={onOpenExerciseDetails}
                onDelete={() => removeExercise(exercise.exerciseId)}
                onToggleExerciseTimer={() =>
                  onOpenExerciseTimerOptions(exercise.exerciseId)
                }
              >
                <View className="flex-row items-center gap-2 px-1 pb-3 pt-1">
                  <Label className="w-8 text-center text-xs">Set</Label>
                  <Label className="flex-1 text-xs">Reps</Label>
                  <Label className="flex-1 text-xs">Weight</Label>
                  <Label className="w-[58px] text-center text-xs">Log</Label>
                </View>
                {exercise.sets.map((setItem, index) => (
                  <WorkoutSetRow
                    key={setItem.id}
                    exerciseName={exercise.exerciseName}
                    setItem={setItem}
                    index={index}
                    onDelete={() => deleteSet(setItem.id)}
                    onUpdateReps={(reps) => updateReps(setItem.id, reps)}
                    onUpdateWeight={(weight) =>
                      updateWeight(setItem.id, weight)
                    }
                    onToggleLogged={(isCompleted) =>
                      toggleSetLogged(
                        exercise.exerciseId,
                        setItem.id,
                        isCompleted,
                      )
                    }
                  />
                ))}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add set to ${exercise.exerciseName}`}
                  className="mt-1 self-start rounded-[12px]  bg-surface-elevated px-3 py-2"
                  onPress={() => addSet(exercise.exerciseId)}
                >
                  <Body className="text-sm font-semibold text-secondary">
                    Add set
                  </Body>
                </Pressable>
              </ExerciseCard>
            ))
          ) : (
            <View className="border-b border-t border-surface-border px-2 py-2">
              <Muted className="text-xs">
                {activeSession.isFreeWorkout
                  ? 'No exercises in this free workout yet.'
                  : 'No exercises in this session yet.'}
              </Muted>
            </View>
          )}
        </ScrollView>

        <View
          className="absolute left-0 right-0 px-2"
          pointerEvents="box-none"
          style={{ bottom: dockOffset }}
        >
          <View className="flex-row items-center gap-1.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add exercise"
              className="h-11 w-11 items-center justify-center rounded-[14px]  bg-surface-card"
              onPress={() => setShowExerciseSheet(true)}
            >
              <Text className="font-mono text-xl text-foreground">+</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete workout"
              className="h-11 w-11 items-center justify-center rounded-[14px]  bg-surface-card px-3"
              onPress={onDeleteWorkout}
            >
              <Body className="text-sm font-semibold text-destructive">x</Body>
            </Pressable>

            <Button
              onPress={onComplete}
              className="flex-1"
              accessibilityLabel="Complete Workout"
            >
              Complete Workout
            </Button>
          </View>
        </View>

        <ExercisePickerBottomSheet
          visible={showExerciseSheet}
          exerciseIdsInSession={activeSession.exercises.map(
            (exercise) => exercise.exerciseId,
          )}
          onClose={() => setShowExerciseSheet(false)}
          onAddExercise={addExercise}
        />
      </View>
    </Container>
  );
}
