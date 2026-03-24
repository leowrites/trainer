/**
 * Active workout content.
 *
 * CALLING SPEC:
 * - coordinate one focused workout scene, the overview modal, and the exercise picker
 * - keep one focused set id in local state with explicit next/previous/jump navigation
 * - flush queued set writes when the focused set changes or the surface unmounts
 * - side effects: none beyond invoking provided callbacks
 */

import { useHeaderHeight } from '@react-navigation/elements';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Container,
  Heading,
  Label,
  Muted,
  Surface,
} from '@shared/components';
import { useReducedMotionPreference } from '@shared/hooks';
import {
  useActiveWorkoutExerciseIds,
  useActiveWorkoutInitialFocusedSetId,
  useActiveWorkoutOverview,
  useActiveWorkoutSessionMeta,
  useActiveWorkoutSetExerciseId,
  useActiveWorkoutSetIds,
  useActiveWorkoutSummary,
} from '../hooks/use-active-workout-state';
import { usePreviousExercisePerformance } from '../hooks/use-previous-exercise-performance';
import type { PreviousExercisePerformance } from '../types';
import { ExercisePickerBottomSheet } from './exercise-picker-bottom-sheet';
import { FocusedWorkoutScene } from './focused-workout-scene';
import { WorkoutOverviewModal } from './workout-overview-modal';

export interface ActiveWorkoutContentProps {
  onCompleteWorkout: () => void;
  onDeleteWorkout: () => void;
  onOpenExerciseDetails: (exerciseId: string) => void;
  onOpenExerciseTimerOptions: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  addExercise: (exerciseId: string, exerciseName: string) => void;
  removeExercise: (exerciseId: string) => void;
  deleteSet: (setId: string) => void;
  updateReps: (setId: string, reps: number) => void;
  updateWeight: (setId: string, weight: number) => void;
  updateActualRir: (setId: string, actualRir: number | null) => void;
  toggleSetLogged: (setId: string, isCompleted: boolean) => void;
  flushPendingWrites: () => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
}

interface FocusedWorkoutSingleSceneProps {
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

function FocusedWorkoutSingleScene({
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
}: FocusedWorkoutSingleSceneProps): React.JSX.Element {
  return (
    <FocusedWorkoutScene
      focusedSetId={focusedSetId}
      headerHeight={headerHeight}
      bottomInset={bottomInset}
      previousPerformance={previousPerformance}
      onOpenOverview={onOpenOverview}
      onOpenExerciseDetails={onOpenExerciseDetails}
      onOpenExerciseTimerOptions={onOpenExerciseTimerOptions}
      onMoveFocus={onMoveFocus}
      onCompleteWorkout={onCompleteWorkout}
      updateReps={updateReps}
      updateWeight={updateWeight}
      updateActualRir={updateActualRir}
      toggleSetLogged={toggleSetLogged}
    />
  );
}

export function ActiveWorkoutContent({
  onCompleteWorkout,
  onDeleteWorkout,
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
  flushPendingWrites,
  insets,
}: ActiveWorkoutContentProps): React.JSX.Element {
  const headerHeight = useHeaderHeight();
  const prefersReducedMotion = useReducedMotionPreference();
  const sessionMeta = useActiveWorkoutSessionMeta();
  const activeSummary = useActiveWorkoutSummary();
  const setIds = useActiveWorkoutSetIds();
  const initialFocusedSetId = useActiveWorkoutInitialFocusedSetId();
  const exerciseIdsInSession = useActiveWorkoutExerciseIds();
  const [showOverview, setShowOverview] = useState(false);
  const [isOverviewContentReady, setIsOverviewContentReady] = useState(false);
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [focusedSetId, setFocusedSetId] = useState<string | null>(null);
  const focusedExerciseId = useActiveWorkoutSetExerciseId(focusedSetId ?? '');
  const previousPerformanceByExerciseId = usePreviousExercisePerformance(
    sessionMeta?.id ?? null,
    exerciseIdsInSession,
  );
  const overview = useActiveWorkoutOverview(
    showOverview && isOverviewContentReady,
  );
  const previousFocusedSetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (setIds.length === 0) {
      setFocusedSetId(null);
      return;
    }

    setFocusedSetId((currentSetId) => {
      if (currentSetId !== null && setIds.includes(currentSetId)) {
        return currentSetId;
      }

      return initialFocusedSetId ?? setIds[0] ?? null;
    });
  }, [initialFocusedSetId, setIds]);

  useEffect(() => {
    const previousFocusedSetId = previousFocusedSetIdRef.current;

    if (
      previousFocusedSetId !== null &&
      focusedSetId !== null &&
      previousFocusedSetId !== focusedSetId
    ) {
      flushPendingWrites();
    }

    previousFocusedSetIdRef.current = focusedSetId;
  }, [flushPendingWrites, focusedSetId]);

  useEffect(() => {
    if (!showOverview) {
      setIsOverviewContentReady(false);
      return;
    }

    const hydrationTimeout = setTimeout(() => {
      setIsOverviewContentReady(true);
    }, 0);

    return () => {
      clearTimeout(hydrationTimeout);
    };
  }, [showOverview]);

  useEffect(() => {
    return () => {
      flushPendingWrites();
    };
  }, [flushPendingWrites]);

  const hasFocusableSet = setIds.length > 0;
  const openOverview = (): void => {
    setIsOverviewContentReady(false);
    setShowOverview(true);
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
              <Heading className="mt-3 text-4xl">
                {sessionMeta?.title ?? 'Workout'}
              </Heading>
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
              <Button onPress={openOverview} className="flex-1">
                Overview
              </Button>
            </View>
          </View>

          {showOverview ? (
            <WorkoutOverviewModal
              visible={showOverview}
              prefersReducedMotion={prefersReducedMotion}
              bottomInset={insets.bottom}
              summary={activeSummary}
              overview={overview}
              currentSetId={null}
              onClose={() => setShowOverview(false)}
              onAddExercise={() => {
                flushPendingWrites();
                setShowOverview(false);
                setShowExerciseSheet(true);
              }}
              onDeleteWorkout={() => {
                flushPendingWrites();
                onDeleteWorkout();
              }}
              onJumpToSet={setFocusedSetId}
              addSet={(exerciseId) => {
                flushPendingWrites();
                addSet(exerciseId);
              }}
              removeExercise={(exerciseId) => {
                flushPendingWrites();
                removeExercise(exerciseId);
              }}
              deleteSet={(setId) => {
                flushPendingWrites();
                deleteSet(setId);
              }}
            />
          ) : null}

          <ExercisePickerBottomSheet
            visible={showExerciseSheet}
            exerciseIdsInSession={exerciseIdsInSession}
            onClose={() => setShowExerciseSheet(false)}
            onAddExercise={(exerciseId, exerciseName) => {
              flushPendingWrites();
              addExercise(exerciseId, exerciseName);
            }}
          />
        </View>
      </Container>
    );
  }

  return (
    <Container edges={['left', 'right']}>
      <FocusedWorkoutSingleScene
        focusedSetId={focusedSetId ?? setIds[0]}
        headerHeight={headerHeight}
        bottomInset={insets.bottom}
        previousPerformance={
          focusedExerciseId === null
            ? null
            : (previousPerformanceByExerciseId[focusedExerciseId] ?? null)
        }
        onOpenOverview={openOverview}
        onOpenExerciseDetails={onOpenExerciseDetails}
        onOpenExerciseTimerOptions={onOpenExerciseTimerOptions}
        onMoveFocus={setFocusedSetId}
        onCompleteWorkout={onCompleteWorkout}
        updateReps={updateReps}
        updateWeight={updateWeight}
        updateActualRir={updateActualRir}
        toggleSetLogged={toggleSetLogged}
      />

      {showOverview ? (
        <WorkoutOverviewModal
          visible={showOverview}
          prefersReducedMotion={prefersReducedMotion}
          bottomInset={insets.bottom}
          summary={activeSummary}
          overview={overview}
          currentSetId={focusedSetId}
          onClose={() => setShowOverview(false)}
          onAddExercise={() => {
            flushPendingWrites();
            setShowOverview(false);
            setShowExerciseSheet(true);
          }}
          onDeleteWorkout={() => {
            flushPendingWrites();
            onDeleteWorkout();
          }}
          onJumpToSet={(nextSetId) => {
            setFocusedSetId(nextSetId);
          }}
          addSet={(exerciseId) => {
            flushPendingWrites();
            addSet(exerciseId);
          }}
          removeExercise={(exerciseId) => {
            flushPendingWrites();
            removeExercise(exerciseId);
          }}
          deleteSet={(setId) => {
            flushPendingWrites();
            deleteSet(setId);
          }}
        />
      ) : null}

      {showExerciseSheet ? (
        <ExercisePickerBottomSheet
          visible={showExerciseSheet}
          exerciseIdsInSession={exerciseIdsInSession}
          onClose={() => setShowExerciseSheet(false)}
          onAddExercise={(exerciseId, exerciseName) => {
            flushPendingWrites();
            addExercise(exerciseId, exerciseName);
          }}
        />
      ) : null}
    </Container>
  );
}
