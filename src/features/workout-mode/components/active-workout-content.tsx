/**
 * Active workout content.
 *
 * CALLING SPEC:
 * - coordinate the active-workout pager, overview modal, and exercise picker
 * - derive focused workout state and route scene callbacks into child views
 * - render an empty-workout fallback when no focusable sets exist yet
 * - has no persistence side effects beyond invoking provided callbacks
 */

import { useHeaderHeight } from '@react-navigation/elements';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import type { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabView } from 'react-native-tab-view';

import {
  Button,
  Container,
  Heading,
  Label,
  Muted,
  Surface,
} from '@shared/components';
import { useReducedMotionPreference } from '@shared/hooks';
import { triggerInteractionFeedback } from '@shared/utils';
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
import { FocusedWorkoutScene } from './focused-workout-scene';
import { WorkoutOverviewModal } from './workout-overview-modal';

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
  location: FocusedWorkoutLocation;
}

const FOCUSED_SCENE_PRELOAD_DISTANCE = 1;

function clampNumber(value: number, minimum = 0): number {
  return Math.max(minimum, value);
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

function shouldRenderFocusedScene(
  routes: FocusedSetRoute[],
  routeKey: string,
  focusedRouteIndex: number,
): boolean {
  const routeIndex = routes.findIndex((route) => route.key === routeKey);

  if (routeIndex === -1) {
    return false;
  }

  return (
    Math.abs(routeIndex - focusedRouteIndex) <= FOCUSED_SCENE_PRELOAD_DISTANCE
  );
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
  onOpenExerciseDetails,
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
    if (!shouldRenderFocusedScene(orderedRoutes, route.key, focusedIndex)) {
      return <View className="flex-1" />;
    }

    return (
      <FocusedWorkoutScene
        activeSession={activeSession}
        routeLocation={route.location}
        currentLocation={location}
        now={now}
        headerHeight={headerHeight}
        bottomInset={insets.bottom}
        restLabel={restLabel}
        startRestTimer={() => startRestTimer()}
        clearRestTimer={clearRestTimer}
        selectedReps={selectedReps}
        selectedWeight={selectedWeight}
        selectedRir={selectedRir}
        completionRewardToken={completionRewardToken}
        previousPerformanceByExerciseId={previousPerformanceByExerciseId}
        exerciseTimerEndsAtByExerciseId={exerciseTimerEndsAtByExerciseId}
        exerciseTimerDurationByExerciseId={exerciseTimerDurationByExerciseId}
        onOpenOverview={() => setShowOverview(true)}
        onOpenExerciseDetails={onOpenExerciseDetails}
        onOpenExerciseTimerOptions={onOpenExerciseTimerOptions}
        onMoveFocus={handleMoveFocus}
        onPreviewWeight={handlePreviewWeight}
        onCommitWeight={(nextWeight) =>
          handleAdjustWeight(nextWeight, { feedback: false })
        }
        onPreviewReps={handlePreviewReps}
        onCommitReps={(nextReps) =>
          handleAdjustReps(nextReps, { feedback: false })
        }
        onAdjustRir={handleAdjustRir}
      />
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

          <WorkoutOverviewModal
            visible={showOverview}
            prefersReducedMotion={prefersReducedMotion}
            bottomInset={insets.bottom}
            activeSession={activeSession}
            currentLocation={null}
            completedExerciseCount={completedExerciseCount}
            completedSetCount={completedSetCount}
            setCount={setCount}
            volume={volume}
            onClose={() => setShowOverview(false)}
            onAddExercise={handleOpenExercisePickerFromOverview}
            onDeleteWorkout={handleDeleteWorkoutFromOverview}
            onJumpToSet={handleMoveFocus}
            addSet={addSet}
            removeExercise={removeExercise}
            deleteSet={deleteSet}
          />

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
          lazy
          lazyPreloadDistance={FOCUSED_SCENE_PRELOAD_DISTANCE}
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

      <WorkoutOverviewModal
        visible={showOverview}
        prefersReducedMotion={prefersReducedMotion}
        bottomInset={insets.bottom}
        activeSession={activeSession}
        currentLocation={location}
        completedExerciseCount={completedExerciseCount}
        completedSetCount={completedSetCount}
        setCount={setCount}
        volume={volume}
        onClose={() => setShowOverview(false)}
        onAddExercise={handleOpenExercisePickerFromOverview}
        onDeleteWorkout={handleDeleteWorkoutFromOverview}
        onJumpToSet={handleMoveFocus}
        addSet={addSet}
        removeExercise={removeExercise}
        deleteSet={deleteSet}
      />

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
