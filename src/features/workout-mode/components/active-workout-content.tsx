import { useHeaderHeight } from '@react-navigation/elements';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import type { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabView } from 'react-native-tab-view';

import {
  Body,
  Button,
  Container,
  Heading,
  InteractivePressable,
  Label,
  Muted,
  Surface,
} from '@shared/components';
import { Divider } from '@/shared/ui/divider';
import { useReducedMotionPreference } from '@shared/hooks';
import { triggerInteractionFeedback } from '@shared/utils';
import { DEFAULT_EXERCISE_TIMER_SECONDS } from '../store';
import {
  buildFocusedWorkoutViewModel,
  findInitialFocusedLocation,
  getNextFocusedLocation,
  resolveFocusedLocation,
} from '../domain/focused-session';
import type {
  ActiveWorkoutSession,
  FocusedWorkoutLocation,
  PreviousExercisePerformance,
} from '../types';
import { ExercisePickerBottomSheet } from './exercise-picker-bottom-sheet';
import { CompleteSetButton } from './complete-set-button';
import { FocusedSetHero } from './focused-set-hero';
import { WorkoutOverviewSetRow } from './workout-overview-set-row';
import {
  formatPreviousPerformance,
  formatRestCountdown,
  formatTimerDuration,
} from '../utils/formatters';

export interface ActiveWorkoutContentProps {
  activeSession: ActiveWorkoutSession;
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
  updateActualRir?: (setId: string, actualRir: number | null) => void;
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

interface FocusedSetRoute {
  key: string;
  title: string;
  location: FocusedWorkoutLocation;
}

function clampNumber(value: number, minimum = 0): number {
  return Math.max(minimum, value);
}

function buildRirOptions(): Array<number | null> {
  return [null, 0, 1, 2, 3, 4];
}

function countCompletedSets(session: ActiveWorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((setItem) => setItem.isCompleted).length,
    0,
  );
}

function countCompletedExercises(session: ActiveWorkoutSession): number {
  return session.exercises.filter(
    (exercise) =>
      exercise.sets.length > 0 &&
      exercise.sets.every((setItem) => setItem.isCompleted),
  ).length;
}

function buildFocusedSetRoutes(
  session: ActiveWorkoutSession,
): FocusedSetRoute[] {
  return session.exercises.flatMap((exercise, exerciseIndex) =>
    exercise.sets.map((_, setIndex) => ({
      key: `${exerciseIndex}:${setIndex}`,
      title: `Set ${setIndex + 1}`,
      location: { exerciseIndex, setIndex },
    })),
  );
}

function findFocusedRouteIndex(
  routes: FocusedSetRoute[],
  location: FocusedWorkoutLocation,
): number {
  const routeIndex = routes.findIndex(
    (route) =>
      route.location.exerciseIndex === location.exerciseIndex &&
      route.location.setIndex === location.setIndex,
  );

  return routeIndex >= 0 ? routeIndex : 0;
}

export function ActiveWorkoutContent({
  activeSession,
  now,
  setCount,
  volume,
  restLabel,
  onComplete,
  onDeleteWorkout,
  startRestTimer,
  clearRestTimer,
  onOpenExerciseDetails: _onOpenExerciseDetails,
  onOpenExerciseTimerOptions,
  addSet,
  addExercise,
  removeExercise,
  deleteSet,
  updateReps,
  updateWeight,
  updateActualRir,
  toggleSetLogged,
  exerciseTimerEndsAtByExerciseId,
  exerciseTimerDurationByExerciseId,
  previousPerformanceByExerciseId,
  showExerciseSheet,
  setShowExerciseSheet,
  insets,
}: ActiveWorkoutContentProps): React.JSX.Element {
  const headerHeight = useHeaderHeight();
  const { width } = useWindowDimensions();
  const prefersReducedMotion = useReducedMotionPreference();
  const [showOverview, setShowOverview] = useState(false);
  const [completionRewardToken, setCompletionRewardToken] = useState(0);
  const orderedRoutes = useMemo(
    () => buildFocusedSetRoutes(activeSession),
    [activeSession],
  );
  const [focusedIndex, setFocusedIndex] = useState(() =>
    findFocusedRouteIndex(
      orderedRoutes,
      findInitialFocusedLocation(activeSession),
    ),
  );
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const completedSetCount = useMemo(
    () => countCompletedSets(activeSession),
    [activeSession],
  );
  const completedExerciseCount = useMemo(
    () => countCompletedExercises(activeSession),
    [activeSession],
  );

  const hasFocusableSet = activeSession.exercises.some(
    (exercise) => exercise.sets.length > 0,
  );
  const location =
    orderedRoutes[focusedIndex]?.location ??
    findInitialFocusedLocation(activeSession);

  const focusedExercise = activeSession.exercises[location.exerciseIndex];
  const focusedSet = focusedExercise?.sets[location.setIndex];
  const [selectedReps, setSelectedReps] = useState(
    focusedSet?.reps ?? focusedExercise?.targetRepsMin ?? 0,
  );
  const [selectedWeight, setSelectedWeight] = useState(focusedSet?.weight ?? 0);
  const [selectedRir, setSelectedRir] = useState<number | null>(
    focusedSet?.actualRir ?? null,
  );

  useEffect(() => {
    setFocusedIndex((currentIndex) => {
      const currentLocation = orderedRoutes[currentIndex]?.location;
      const nextLocation = resolveFocusedLocation(
        activeSession,
        currentLocation ?? findInitialFocusedLocation(activeSession),
      );

      return findFocusedRouteIndex(orderedRoutes, nextLocation);
    });
  }, [activeSession, orderedRoutes]);

  useEffect(() => {
    const exercise = activeSession.exercises[location.exerciseIndex];
    const setItem = exercise?.sets[location.setIndex];

    if (!exercise || !setItem) {
      return;
    }

    setSelectedReps(setItem.reps ?? exercise.targetRepsMin ?? 0);
    setSelectedWeight(setItem.weight ?? 0);
    setSelectedRir(setItem.actualRir ?? null);
  }, [activeSession, location]);

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current === null) {
        return;
      }

      clearTimeout(completionTimeoutRef.current);
    };
  }, []);

  const handleMoveFocus = (nextLocation: FocusedWorkoutLocation): void => {
    setFocusedIndex(findFocusedRouteIndex(orderedRoutes, nextLocation));
    setShowOverview(false);
  };

  const handlePreviewReps = (nextReps: number): void => {
    setSelectedReps(clampNumber(nextReps));
  };

  const handlePreviewWeight = (nextWeight: number): void => {
    setSelectedWeight(clampNumber(nextWeight));
  };

  const handleOpenExercisePickerFromOverview = (): void => {
    setShowOverview(false);
    setShowExerciseSheet(true);
  };

  const handleDeleteWorkoutFromOverview = (): void => {
    setShowOverview(false);
    onDeleteWorkout();
  };

  const handleAdjustReps = (
    nextReps: number,
    options?: { feedback?: boolean },
  ): void => {
    if (viewModel === null) {
      return;
    }

    const normalizedReps = clampNumber(nextReps);
    setSelectedReps(normalizedReps);
    updateReps(viewModel.setId, normalizedReps);

    if (options?.feedback !== false) {
      triggerInteractionFeedback('set-adjust');
    }
  };

  const handleAdjustWeight = (
    nextWeight: number,
    options?: { feedback?: boolean },
  ): void => {
    if (viewModel === null) {
      return;
    }

    const normalizedWeight = clampNumber(nextWeight);
    setSelectedWeight(normalizedWeight);
    updateWeight(viewModel.setId, normalizedWeight);

    if (options?.feedback !== false) {
      triggerInteractionFeedback('set-adjust');
    }
  };

  const commitFocusedSetValues = (): void => {
    if (viewModel === null) {
      return;
    }

    updateReps(viewModel.setId, selectedReps);
    updateWeight(viewModel.setId, selectedWeight);
  };

  const handleAdjustRir = (nextRir: number | null): void => {
    if (viewModel === null) {
      return;
    }

    commitFocusedSetValues();
    setSelectedRir(nextRir);
    updateActualRir?.(viewModel.setId, nextRir);
    triggerInteractionFeedback('set-adjust');
  };

  const handleCompleteSet = (): void => {
    if (viewModel === null) {
      return;
    }

    commitFocusedSetValues();
    updateActualRir?.(viewModel.setId, selectedRir);
    const didLogSet = !viewModel.isCompleted;

    if (didLogSet) {
      toggleSetLogged(viewModel.exerciseId, viewModel.setId, true);
      triggerInteractionFeedback('set-log');
      setCompletionRewardToken((currentToken) => currentToken + 1);
    }

    const advanceWorkoutFlow = (): void => {
      const nextLocation = getNextFocusedLocation(activeSession, location);

      if (
        nextLocation.exerciseIndex === location.exerciseIndex &&
        nextLocation.setIndex === location.setIndex
      ) {
        onComplete();
        return;
      }

      handleMoveFocus(nextLocation);
    };

    if (!didLogSet || prefersReducedMotion) {
      advanceWorkoutFlow();
      return;
    }

    if (completionTimeoutRef.current !== null) {
      clearTimeout(completionTimeoutRef.current);
    }

    completionTimeoutRef.current = setTimeout(() => {
      completionTimeoutRef.current = null;
      advanceWorkoutFlow();
    }, 180);
  };

  const viewModel = useMemo(
    () =>
      hasFocusableSet
        ? buildFocusedWorkoutViewModel({
            session: activeSession,
            location,
            selectedReps,
            selectedRir,
            previousPerformance:
              previousPerformanceByExerciseId[
                activeSession.exercises[location.exerciseIndex]?.exerciseId ??
                  ''
              ] ?? null,
          })
        : null,
    [
      activeSession,
      hasFocusableSet,
      location,
      previousPerformanceByExerciseId,
      selectedReps,
      selectedRir,
    ],
  );

  const renderFocusedSetScene = ({
    route,
  }: {
    route: FocusedSetRoute;
  }): React.JSX.Element => {
    const routeExercise = activeSession.exercises[route.location.exerciseIndex];
    const routeSet = routeExercise?.sets[route.location.setIndex];

    if (!routeExercise || !routeSet) {
      return <View />;
    }

    const isFocusedRoute =
      route.location.exerciseIndex === location.exerciseIndex &&
      route.location.setIndex === location.setIndex;
    const sceneReps = isFocusedRoute
      ? selectedReps
      : (routeSet.reps ?? routeExercise.targetRepsMin ?? 0);
    const sceneWeight = isFocusedRoute
      ? selectedWeight
      : (routeSet.weight ?? 0);
    const sceneRir = isFocusedRoute
      ? selectedRir
      : (routeSet.actualRir ?? null);
    const sceneViewModel = buildFocusedWorkoutViewModel({
      session: activeSession,
      location: route.location,
      selectedReps: sceneReps,
      selectedRir: sceneRir,
      previousPerformance:
        previousPerformanceByExerciseId[routeExercise.exerciseId] ?? null,
    });
    const sceneRestTimerLabel =
      exerciseTimerEndsAtByExerciseId[sceneViewModel.exerciseId] !== null &&
      exerciseTimerEndsAtByExerciseId[sceneViewModel.exerciseId] !==
        undefined &&
      (exerciseTimerEndsAtByExerciseId[sceneViewModel.exerciseId] ?? 0) > now
        ? formatRestCountdown(
            (exerciseTimerEndsAtByExerciseId[sceneViewModel.exerciseId] ?? 0) -
              now,
          )
        : formatTimerDuration(
            exerciseTimerDurationByExerciseId[sceneViewModel.exerciseId] ??
              DEFAULT_EXERCISE_TIMER_SECONDS,
          );
    const sceneNextLocation = getNextFocusedLocation(
      activeSession,
      route.location,
    );

    return (
      <View className="flex-1" pointerEvents={isFocusedRoute ? 'auto' : 'none'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={{
            paddingTop: headerHeight + 10,
            paddingBottom: insets.bottom + 112,
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

              <Button
                size="sm"
                variant="secondary"
                onPress={() => setShowOverview(true)}
              >
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
              <Heading className="mt-2">{`Target: ${sceneViewModel.guidance.targetLabel}`}</Heading>
              <Label className="text-xl">{sceneViewModel.guidance.text}</Label>
            </Surface>

            <View className="flex-row flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onPress={() => handleMoveFocus(sceneNextLocation)}
              >
                Skip
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
                {restLabel
                  ? `Rest ${restLabel}`
                  : `Timer ${sceneRestTimerLabel}`}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setShowOverview(true)}
              >
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
  };

  if (!hasFocusableSet) {
    return (
      <Container className="px-0 pb-0" edges={['left', 'right']}>
        <View className="flex-1">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            contentContainerStyle={{
              paddingTop: headerHeight + 10,
              paddingBottom: insets.bottom + 112,
              gap: 14,
            }}
          >
            <Surface className="rounded-[28px] px-6 py-6">
              <Label>Ready</Label>
              <Heading className="mt-3 text-4xl">{activeSession.title}</Heading>
              <Muted className="mt-3">
                Add an exercise to start the focused flow.
              </Muted>
            </Surface>
          </ScrollView>

          <View
            className="absolute bottom-0 left-0 right-0 px-2 pb-2"
            style={{ paddingBottom: Math.max(insets.bottom, 8) }}
          >
            <View className="rounded-[24px] border border-surface-border bg-surface-card p-2">
              <Button onPress={() => setShowOverview(true)} className="flex-1">
                Overview
              </Button>
            </View>
          </View>

          <Modal
            visible={showOverview}
            animationType={prefersReducedMotion ? 'none' : 'slide'}
            transparent
            allowSwipeDismissal={true}
            onRequestClose={() => setShowOverview(false)}
          >
            <View className="flex-1 justify-end bg-black/40">
              <View
                className="rounded-t-[28px] border border-surface-border bg-surface-card px-5 pt-5"
                style={{ paddingBottom: insets.bottom + 16 }}
              >
                <Heading className="text-2xl">Overview</Heading>
                <Muted className="mt-2">
                  No exercises yet. Add one to begin logging.
                </Muted>
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <Button
                    onPress={handleOpenExercisePickerFromOverview}
                    className="flex-1"
                    accessibilityLabel="Add exercise"
                  >
                    + Add exercise
                  </Button>
                  <Button
                    variant="danger"
                    onPress={handleDeleteWorkoutFromOverview}
                    className="flex-1"
                    accessibilityLabel="Delete workout"
                  >
                    Delete workout
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => setShowOverview(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </View>
              </View>
            </View>
          </Modal>

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

  if (viewModel === null) {
    return (
      <Container>
        <View />
      </Container>
    );
  }

  return (
    <Container edges={['left', 'right']}>
      <View className="flex-1">
        <TabView
          testID="focused-workout-tab-view"
          navigationState={{
            index: focusedIndex,
            routes: orderedRoutes,
          }}
          onIndexChange={setFocusedIndex}
          renderScene={renderFocusedSetScene}
          renderTabBar={() => null}
          initialLayout={{ width }}
          animationEnabled={!prefersReducedMotion}
          style={{ flex: 1, marginHorizontal: -16 }}
        />

        <View
          className="absolute bottom-0 left-0 right-0 pb-2"
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
        >
          <View className="flex-row items-center gap-2 rounded-[24px] border border-surface-border bg-surface-card p-2">
            <CompleteSetButton
              label={
                viewModel.totalRemainingSets === 0 && viewModel.isCompleted
                  ? 'Finish Workout'
                  : 'Complete Set'
              }
              rewardToken={completionRewardToken}
              onPress={
                viewModel.totalRemainingSets === 0 && viewModel.isCompleted
                  ? onComplete
                  : handleCompleteSet
              }
            />
          </View>
        </View>
      </View>

      <Modal
        visible={showOverview}
        animationType={prefersReducedMotion ? 'none' : 'slide'}
        transparent
        allowSwipeDismissal={true}
        onRequestClose={() => setShowOverview(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[80%] rounded-t-[28px] border border-surface-border bg-surface-card px-5 pt-5">
            <View className="flex-row items-center justify-between gap-3">
              <Heading className="text-2xl">Overview</Heading>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setShowOverview(false)}
              >
                Close
              </Button>
            </View>

            <View className="gap-3 pb-4">
              <Muted className="text-sm">
                {completedExerciseCount}/{activeSession.exercises.length}{' '}
                exercises · {completedSetCount}/{setCount} sets · {volume}{' '}
                volume
              </Muted>
              <Button
                size="sm"
                variant="secondary"
                onPress={handleOpenExercisePickerFromOverview}
                accessibilityLabel="Add exercise"
              >
                + Add exercise
              </Button>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-4 pb-4">
                {activeSession.exercises.map((exercise, exerciseIndex) => (
                  <View
                    key={exercise.exerciseId}
                    className="rounded-[20px] px-4 py-4"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Body className="font-semibold">
                          {exercise.exerciseName}
                        </Body>
                      </View>
                    </View>

                    <View className="mt-4 gap-2">
                      {exercise.sets.map((setItem, setIndex) => {
                        const isCurrent =
                          location.exerciseIndex === exerciseIndex &&
                          location.setIndex === setIndex;

                        return (
                          <WorkoutOverviewSetRow
                            key={setItem.id}
                            setLabel={`Set ${setIndex + 1}`}
                            reps={setItem.reps}
                            weight={setItem.weight}
                            isCompleted={setItem.isCompleted}
                            isCurrent={isCurrent}
                            onJump={() =>
                              handleMoveFocus({
                                exerciseIndex,
                                setIndex,
                              })
                            }
                            onDelete={() => deleteSet(setItem.id)}
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
                    <Divider className="mt-4" />
                  </View>
                ))}

                {activeSession.exercises.length === 0 ? (
                  <Surface className="rounded-[24px] px-5 py-5">
                    <Heading className="text-2xl">No exercises yet</Heading>
                    <Muted className="mt-2">
                      Add an exercise to start the focused flow.
                    </Muted>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-4 self-start"
                      onPress={handleOpenExercisePickerFromOverview}
                      accessibilityLabel="Add exercise"
                    >
                      + Add exercise
                    </Button>
                  </Surface>
                ) : null}

                <View className="pt-2">
                  <Button
                    size="sm"
                    variant="danger"
                    onPress={handleDeleteWorkoutFromOverview}
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

      <ExercisePickerBottomSheet
        visible={showExerciseSheet}
        exerciseIdsInSession={activeSession.exercises.map(
          (exercise) => exercise.exerciseId,
        )}
        onClose={() => setShowExerciseSheet(false)}
        onAddExercise={addExercise}
      />
    </Container>
  );
}
