/**
 * Workout overview modal.
 *
 * CALLING SPEC:
 * - render the active-workout overview modal for empty and populated sessions
 * - exposes only presentation and callback wiring for overview actions
 * - has no persistence side effects on its own
 */

import React from 'react';
import { Modal, ScrollView, View } from 'react-native';

import { Body, Button, Heading, Muted } from '@shared/components';
import type { ActiveWorkoutOverview, ActiveWorkoutSummary } from '../types';
import { WorkoutOverviewSetRow } from './workout-overview-set-row';

interface WorkoutOverviewModalProps {
  visible: boolean;
  prefersReducedMotion: boolean;
  bottomInset: number;
  summary: ActiveWorkoutSummary;
  overview: ActiveWorkoutOverview | null;
  currentSetId: string | null;
  onClose: () => void;
  onAddExercise: () => void;
  onDeleteWorkout: () => void;
  onJumpToSet: (setId: string | null) => void;
  addSet: (exerciseId: string) => void;
  removeExercise: (exerciseId: string) => void;
  deleteSet: (setId: string) => void;
}

export function WorkoutOverviewModal({
  visible,
  prefersReducedMotion,
  bottomInset,
  summary,
  overview,
  currentSetId,
  onClose,
  onAddExercise,
  onDeleteWorkout,
  onJumpToSet,
  addSet,
  removeExercise,
  deleteSet,
}: WorkoutOverviewModalProps): React.JSX.Element {
  const hasFocusableSet = summary.setCount > 0;

  if (!hasFocusableSet) {
    return (
      <Modal
        visible={visible}
        animationType={prefersReducedMotion ? 'none' : 'slide'}
        transparent
        allowSwipeDismissal={true}
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="rounded-t-[28px] border border-surface-border bg-surface-card px-5 pt-5"
            style={{ paddingBottom: bottomInset + 16 }}
          >
            <Heading className="text-2xl">Overview</Heading>
            <Muted className="mt-2">
              No exercises yet. Add one to begin logging.
            </Muted>
            <View className="mt-4 flex-row flex-wrap gap-2">
              <Button
                onPress={onAddExercise}
                className="flex-1"
                accessibilityLabel="Add exercise"
              >
                + Add exercise
              </Button>
              <Button
                variant="danger"
                onPress={onDeleteWorkout}
                className="flex-1"
                accessibilityLabel="Delete workout"
              >
                Delete workout
              </Button>
              <Button variant="secondary" onPress={onClose} className="flex-1">
                Close
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType={prefersReducedMotion ? 'none' : 'slide'}
      transparent
      allowSwipeDismissal={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[80%] rounded-t-[28px] bg-surface-card p-4">
          <View className="flex-row items-center justify-between">
            <Heading className="text-xl">Overview</Heading>
            <Button size="sm" variant="ghost" onPress={onClose}>
              Close
            </Button>
          </View>

          <View className="gap-3 pb-4">
            <Muted className="text-sm">
              {summary.completedExerciseCount}/{summary.exerciseCount} exercises
              · {summary.completedSetCount}/{summary.setCount} sets ·{' '}
              {summary.volume} volume
            </Muted>
            <Button
              size="sm"
              variant="secondary"
              onPress={onAddExercise}
              accessibilityLabel="Add exercise"
            >
              + Add exercise
            </Button>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4 pb-2">
              {overview === null ? (
                <View className="rounded-[20px] px-4 py-4">
                  <Muted className="text-sm">Loading workout details...</Muted>
                </View>
              ) : (
                overview.exercises.map((exercise) => (
                  <View
                    key={exercise.exerciseId}
                    className="rounded-[20px] py-2"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Body className="font-semibold">
                          {exercise.exerciseName}
                        </Body>
                      </View>
                    </View>

                    <View className="mt-4 gap-2">
                      {exercise.sets.map((setItem) => {
                        return (
                          <WorkoutOverviewSetRow
                            key={setItem.setId}
                            setLabel={setItem.setLabel}
                            reps={setItem.reps}
                            weight={setItem.weight}
                            isCompleted={setItem.isCompleted}
                            isCurrent={currentSetId === setItem.setId}
                            onJump={() => onJumpToSet(setItem.setId)}
                            onDelete={() => deleteSet(setItem.setId)}
                          />
                        );
                      })}
                    </View>

                    <View className="mt-4 flex-row gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => addSet(exercise.exerciseId)}
                      >
                        Add set
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => removeExercise(exercise.exerciseId)}
                      >
                        Remove exercise
                      </Button>
                    </View>
                  </View>
                ))
              )}

              <View>
                <Button
                  variant="danger"
                  onPress={onDeleteWorkout}
                  accessibilityLabel="Delete workout"
                >
                  Delete workout
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
