/**
 * Focused workout scene.
 *
 * CALLING SPEC:
 * - render one fixed-screen set control surface for active workout logging
 * - keep stack navigation linear by route order with one-step vertical swipe snaps
 * - keep editing wheel-only for weight/reps with commit-on-dismiss semantics
 * - enforce one-active-interaction mode while the wheel editor is open
 * - side effects: invokes optimistic workout actions supplied by the parent
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  PanResponder,
  Pressable,
  useWindowDimensions,
  View,
  unstable_batchedUpdates,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Body, Button, Heading, Label, Muted, Surface } from '@shared/components';
import { useReducedMotionPreference } from '@shared/hooks';
import { triggerInteractionFeedback } from '@shared/utils';
import { buildFocusedWorkoutViewModel } from '../domain/focused-session';
import {
  useActiveWorkoutSetSceneState,
  useExerciseTimerState,
} from '../hooks/use-active-workout-state';
import {
  DEFAULT_EXERCISE_TIMER_SECONDS,
  type WorkoutStore,
  useWorkoutStore,
} from '../store';
import type { PreviousExercisePerformance } from '../types';
import { formatPreviousPerformance } from '../utils/formatters';
import { CompleteSetButton } from './complete-set-button';
import {
  buildHeroWheelOptions,
  formatHeroValue,
  type HeroValueField,
} from './focused-set-hero-helpers';
import { WorkoutTimerButtonLabel } from './workout-timer-button-label';

const STACK_SWIPE_TRIGGER_PX = 36;
const STACK_SNAP_DISTANCE_PX = 52;
const STACK_BOUNDARY_PULSE_PX = 14;
const STACK_TRANSITION_MS = 220;
const PICKER_ITEM_WIDTH = 92;
const PICKER_MAX_WEIGHT = 500;
const PICKER_MAX_REPS = 30;

type EditMode = HeroValueField | null;

type SetPreviewType = 'same_exercise' | 'cross_exercise';

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

interface AdjacentSetPreview {
  setId: string;
  type: SetPreviewType;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  totalSetsForExercise: number;
  reps: number;
  weight: number;
  isCompleted: boolean;
}

interface RouteSnapshot {
  activeRouteSetIds: string[];
  activeSetsById: WorkoutStore['activeSetsById'];
  activeExercisesById: WorkoutStore['activeExercisesById'];
}

interface HorizontalValuePickerProps {
  field: HeroValueField;
  value: number;
  options: number[];
  onPreviewValue: (value: number) => void;
}

function buildRirOptions(): Array<number | null> {
  return [null, 0, 1, 2, 3, 4];
}

function clampNumber(value: number, minimum = 0): number {
  return Math.max(minimum, value);
}

function buildPickerOptions(field: HeroValueField, selectedValue: number): number[] {
  if (field === 'weight') {
    return buildHeroWheelOptions(selectedValue, PICKER_MAX_WEIGHT, 5);
  }

  return buildHeroWheelOptions(selectedValue, PICKER_MAX_REPS, 1);
}

function buildAdjacentSetPreview(
  routeSnapshot: RouteSnapshot,
  setId: string,
  currentExerciseId: string,
): AdjacentSetPreview | null {
  const setItem = routeSnapshot.activeSetsById[setId];

  if (!setItem) {
    return null;
  }

  const exercise = routeSnapshot.activeExercisesById[setItem.exerciseId];

  if (!exercise) {
    return null;
  }

  const setNumber = exercise.setIds.indexOf(setId) + 1;

  return {
    setId,
    type: setItem.exerciseId === currentExerciseId ? 'same_exercise' : 'cross_exercise',
    exerciseId: setItem.exerciseId,
    exerciseName: exercise.exerciseName,
    setNumber,
    totalSetsForExercise: exercise.setIds.length,
    reps: setItem.reps,
    weight: setItem.weight,
    isCompleted: setItem.isCompleted,
  };
}

function formatSetValue(weight: number, reps: number): string {
  return `${weight} x ${reps}`;
}

function HorizontalValuePicker({
  field,
  value,
  options,
  onPreviewValue,
}: HorizontalValuePickerProps): React.JSX.Element {
  const listRef = useRef<FlatList<number> | null>(null);
  const { width } = useWindowDimensions();

  const selectedIndex = useMemo(() => {
    const index = options.indexOf(value);
    return index >= 0 ? index : 0;
  }, [options, value]);

  const sidePadding = Math.max(0, width / 2 - PICKER_ITEM_WIDTH / 2 - 24);

  const updatePreviewFromOffset = useCallback(
    (offsetX: number): void => {
      const rawIndex = Math.round(offsetX / PICKER_ITEM_WIDTH);
      const boundedIndex = Math.max(0, Math.min(options.length - 1, rawIndex));
      const nextValue = options[boundedIndex];

      if (nextValue !== value) {
        onPreviewValue(nextValue);
      }
    },
    [onPreviewValue, options, value],
  );

  return (
    <FlatList
      ref={listRef}
      horizontal
      key={`${field}-${options.length}`}
      testID={`active-set-${field}-picker`}
      data={options}
      initialScrollIndex={selectedIndex}
      showsHorizontalScrollIndicator={false}
      snapToInterval={PICKER_ITEM_WIDTH}
      decelerationRate="fast"
      getItemLayout={(_data, index) => ({
        length: PICKER_ITEM_WIDTH,
        offset: PICKER_ITEM_WIDTH * index,
        index,
      })}
      contentContainerStyle={{
        paddingHorizontal: sidePadding,
      }}
      keyExtractor={(item) => `${field}-${item}`}
      renderItem={({ item }) => {
        const isSelected = item === value;

        return (
          <View
            style={{ width: PICKER_ITEM_WIDTH }}
            className="items-center justify-center py-2"
          >
            <Label
              className={isSelected ? 'text-4xl text-accent' : 'text-2xl text-muted'}
            >
              {formatHeroValue(field, item)}
            </Label>
          </View>
        );
      }}
      onScroll={(event) => {
        updatePreviewFromOffset(event.nativeEvent.contentOffset.x);
      }}
      onMomentumScrollEnd={(event) => {
        updatePreviewFromOffset(event.nativeEvent.contentOffset.x);
      }}
      scrollEventThrottle={16}
    />
  );
}

function AdjacentSetRow({
  preview,
  direction,
}: {
  preview: AdjacentSetPreview | null;
  direction: 'previous' | 'next';
}): React.JSX.Element {
  if (!preview) {
    return <View className="h-20" />;
  }

  if (preview.type === 'same_exercise') {
    return (
      <View className="h-20 items-center justify-center opacity-60">
        <Label className="text-3xl text-foreground">
          {formatSetValue(preview.weight, preview.reps)}
          {preview.isCompleted ? ' (done)' : ''}
        </Label>
      </View>
    );
  }

  return (
    <View className="h-20 items-center justify-center opacity-45">
      <Muted className="text-xs uppercase tracking-wide">
        {direction === 'previous' ? 'Previous exercise' : 'Next exercise'}
      </Muted>
      <Body className="mt-1 font-semibold text-sm">
        {preview.exerciseName} - {preview.setNumber}/{preview.totalSetsForExercise}
      </Body>
      <Body className="mt-1 text-sm">
        {formatSetValue(preview.weight, preview.reps)}
        {preview.isCompleted ? ' (done)' : ''}
      </Body>
    </View>
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
  const routeSnapshot = useWorkoutStore(
    useShallow((state) => ({
      activeRouteSetIds: state.activeRouteSetIds,
      activeSetsById: state.activeSetsById,
      activeExercisesById: state.activeExercisesById,
    })),
  );
  const startRestTimer = useWorkoutStore((state) => state.startRestTimer);
  const clearRestTimer = useWorkoutStore((state) => state.clearRestTimer);
  const startExerciseTimer = useWorkoutStore((state) => state.startExerciseTimer);
  const { restTimerEndsAt, exerciseTimerEndsAt, exerciseTimerDuration } =
    useExerciseTimerState(sceneState?.exerciseId ?? '');

  const stackTranslateY = useRef(new Animated.Value(0)).current;
  const completionPulse = useRef(new Animated.Value(1)).current;
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [lastEditedField, setLastEditedField] = useState<HeroValueField>('weight');
  const [draftWeight, setDraftWeight] = useState(0);
  const [draftReps, setDraftReps] = useState(0);
  const [isCompletingTransition, setIsCompletingTransition] = useState(false);

  if (sceneState === null) {
    return <View className="flex-1" />;
  }

  const currentRouteIndex = routeSnapshot.activeRouteSetIds.indexOf(sceneState.set.id);
  const previousSetId =
    currentRouteIndex > 0
      ? routeSnapshot.activeRouteSetIds[currentRouteIndex - 1]
      : null;
  const nextSetId =
    currentRouteIndex >= 0 &&
    currentRouteIndex < routeSnapshot.activeRouteSetIds.length - 1
      ? routeSnapshot.activeRouteSetIds[currentRouteIndex + 1]
      : null;

  const previousPreview = buildAdjacentSetPreview(
    routeSnapshot,
    previousSetId ?? '',
    sceneState.exerciseId,
  );
  const nextPreview = buildAdjacentSetPreview(
    routeSnapshot,
    nextSetId ?? '',
    sceneState.exerciseId,
  );

  const canNavigatePrevious = previousSetId !== null;
  const canNavigateNext = nextSetId !== null;
  const isEditModeActive = editMode !== null;
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

  const dismissEditMode = useCallback((): void => {
    if (editMode === null) {
      return;
    }

    if (editMode === 'weight') {
      const nextWeight = clampNumber(draftWeight);
      if (nextWeight !== sceneState.set.weight) {
        updateWeight(sceneState.set.id, nextWeight);
      }
    }

    if (editMode === 'reps') {
      const nextReps = Math.round(clampNumber(draftReps));
      if (nextReps !== sceneState.set.reps) {
        updateReps(sceneState.set.id, nextReps);
      }
    }

    triggerInteractionFeedback('set-adjust');
    setLastEditedField(editMode);
    setEditMode(null);
  }, [
    draftReps,
    draftWeight,
    editMode,
    sceneState.set.id,
    sceneState.set.reps,
    sceneState.set.weight,
    updateReps,
    updateWeight,
  ]);

  const openEditMode = useCallback(
    (field: HeroValueField): void => {
      if (controlsDisabled) {
        return;
      }

      setDraftWeight(sceneState.set.weight);
      setDraftReps(sceneState.set.reps);
      setEditMode(field);
    },
    [controlsDisabled, sceneState.set.reps, sceneState.set.weight],
  );

  const animateBoundaryResistance = useCallback(
    (direction: 1 | -1): void => {
      if (prefersReducedMotion) {
        stackTranslateY.setValue(0);
        return;
      }

      Animated.sequence([
        Animated.timing(stackTranslateY, {
          toValue: direction * STACK_BOUNDARY_PULSE_PX,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(stackTranslateY, {
          toValue: 0,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [prefersReducedMotion, stackTranslateY],
  );

  const animateMoveToSet = useCallback(
    (targetSetId: string | null): void => {
      if (!targetSetId) {
        onCompleteWorkout();
        return;
      }

      if (prefersReducedMotion) {
        onMoveFocus(targetSetId);
        stackTranslateY.setValue(0);
        return;
      }

      const direction =
        nextSetId === targetSetId
          ? -1
          : previousSetId === targetSetId
            ? 1
            : -1;

      Animated.timing(stackTranslateY, {
        toValue: direction * STACK_SNAP_DISTANCE_PX,
        duration: STACK_TRANSITION_MS,
        useNativeDriver: true,
      }).start(() => {
        stackTranslateY.setValue(0);
        onMoveFocus(targetSetId);
      });
    },
    [nextSetId, onCompleteWorkout, onMoveFocus, prefersReducedMotion, previousSetId, stackTranslateY],
  );

  const handleMoveBySwipe = useCallback(
    (deltaY: number): void => {
      if (controlsDisabled) {
        return;
      }

      if (Math.abs(deltaY) < STACK_SWIPE_TRIGGER_PX) {
        Animated.timing(stackTranslateY, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }).start();
        return;
      }

      if (deltaY > 0) {
        if (!canNavigatePrevious) {
          animateBoundaryResistance(1);
          return;
        }

        animateMoveToSet(previousSetId);
        return;
      }

      if (!canNavigateNext) {
        animateBoundaryResistance(-1);
        return;
      }

      animateMoveToSet(nextSetId);
    },
    [
      animateBoundaryResistance,
      animateMoveToSet,
      canNavigateNext,
      canNavigatePrevious,
      controlsDisabled,
      nextSetId,
      previousSetId,
      stackTranslateY,
    ],
  );

  const stackPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !controlsDisabled &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 8,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !controlsDisabled &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 8,
        onPanResponderMove: (_, gestureState) => {
          const draggingTowardPrevious = gestureState.dy > 0;
          const draggingTowardNext = gestureState.dy < 0;
          const isBoundaryDrag =
            (draggingTowardPrevious && !canNavigatePrevious) ||
            (draggingTowardNext && !canNavigateNext);
          const resistance = isBoundaryDrag ? 0.2 : 0.45;

          stackTranslateY.setValue(gestureState.dy * resistance);
        },
        onPanResponderRelease: (_, gestureState) => {
          handleMoveBySwipe(gestureState.dy);
        },
        onPanResponderTerminate: () => {
          Animated.timing(stackTranslateY, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }).start();
        },
      }),
    [
      canNavigateNext,
      canNavigatePrevious,
      controlsDisabled,
      handleMoveBySwipe,
      stackTranslateY,
    ],
  );

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

  const pickerField: HeroValueField = editMode ?? 'weight';
  const pickerValue = pickerField === 'weight' ? draftWeight : draftReps;
  const pickerOptions = buildPickerOptions(pickerField, pickerValue);

  return (
    <View testID="focused-workout-scene" className="flex-1 px-4" style={{ paddingTop: headerHeight + 8, paddingBottom: Math.max(bottomInset, 8) }}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Heading className="text-3xl">{sceneViewModel.exerciseName}</Heading>
          <Muted className="mt-1 text-sm">
            Set {sceneViewModel.setNumber} of {sceneViewModel.totalSetsForExercise}
            {sceneViewModel.totalRemainingSets > 0
              ? ` - ${sceneViewModel.totalRemainingSets} sets left`
              : ' - Last set'}
          </Muted>
        </View>
        <Button size="sm" variant="secondary" onPress={onOpenOverview} disabled={controlsDisabled}>
          Overview
        </Button>
      </View>

      <View className="mt-4 flex-1 justify-center">
        <View
          testID="set-control-stack"
          className="items-stretch"
          {...stackPanResponder.panHandlers}
        >
          <AdjacentSetRow preview={previousPreview} direction="previous" />

          <Animated.View
            className="items-center justify-center py-4"
            style={{
              transform: [{ translateY: stackTranslateY }, { scale: completionPulse }],
              opacity: isCompletingTransition ? 0.95 : 1,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit current set weight"
              onPress={() => openEditMode('weight')}
              disabled={controlsDisabled}
            >
              <Label className="text-5xl text-accent">
                {selectedWeight}
              </Label>
            </Pressable>
            <Body className="mt-1 text-xl">x</Body>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit current set reps"
              onPress={() => openEditMode('reps')}
              disabled={controlsDisabled}
            >
              <Label className="text-5xl text-accent">{selectedReps}</Label>
            </Pressable>
            <Body className="mt-2 font-semibold">
              {sceneViewModel.exerciseName} - {sceneViewModel.setNumber}/{sceneViewModel.totalSetsForExercise}
              {sceneState.set.isCompleted ? ' (done)' : ''}
            </Body>
            <Muted className="mt-1">{formatPreviousPerformance(previousPerformance)}</Muted>
          </Animated.View>

          <AdjacentSetRow preview={nextPreview} direction="next" />
        </View>
      </View>

      <Surface className="mt-3">
        <Heading className="text-xl">RIR</Heading>
        <View className="mt-2 flex-row gap-2">
          {buildRirOptions().map((value) => {
            const isSelected = (sceneState.set.actualRir ?? null) === value;

            return (
              <Button
                key={value === null ? 'skip' : String(value)}
                size="sm"
                variant={isSelected ? 'primary' : 'secondary'}
                className="flex-1"
                onPress={() => handleAdjustRir(value)}
                disabled={controlsDisabled}
              >
                {value === null ? 'Skip' : String(value)}
              </Button>
            );
          })}
        </View>
      </Surface>

      <Surface className="mt-2">
        <Heading className="text-lg">Target: {sceneViewModel.guidance.targetLabel}</Heading>
        <Label className="mt-1 text-xl">{sceneViewModel.guidance.text}</Label>
      </Surface>

      <View className="mt-2 flex-row gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onPress={() => {
            if (controlsDisabled) {
              return;
            }

            if (restTimerEndsAt !== null && restTimerEndsAt > Date.now()) {
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
          variant="secondary"
          className="flex-1"
          onPress={() => openEditMode(lastEditedField)}
          disabled={controlsDisabled}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onPress={() => onOpenExerciseDetails(sceneViewModel.exerciseId)}
          disabled={controlsDisabled}
        >
          Notes
        </Button>
      </View>

      <View className={`mt-2 ${controlsDisabled ? 'opacity-40' : ''}`}>
        <CompleteSetButton
          label={
            sceneViewModel.totalRemainingSets === 0 && sceneViewModel.isCompleted
              ? 'Finish Workout'
              : 'Complete Set'
          }
          onPress={
            controlsDisabled
              ? () => {}
              : sceneViewModel.totalRemainingSets === 0 &&
                  sceneViewModel.isCompleted
                ? onCompleteWorkout
                : handleCompleteSet
          }
        />
      </View>

      {isEditModeActive ? (
        <Pressable
          testID="active-set-edit-overlay"
          className="absolute inset-0 bg-black/55"
          onPress={dismissEditMode}
        >
          <View className="flex-1 items-center justify-center px-4">
            <Pressable
              className="w-full rounded-2xl border border-surface-border bg-surface-card p-4"
              onPress={(event) => {
                event.stopPropagation();
              }}
            >
              <Label className="text-accent text-center text-lg">
                Adjust {pickerField === 'weight' ? 'Weight' : 'Reps'}
              </Label>
              <Muted className="mt-1 text-center">Swipe to preview, tap outside to save</Muted>
              <View className="mt-4">
                <HorizontalValuePicker
                  field={pickerField}
                  value={pickerValue}
                  options={pickerOptions}
                  onPreviewValue={(nextValue) => {
                    if (pickerField === 'weight') {
                      setDraftWeight(nextValue);
                      return;
                    }

                    setDraftReps(nextValue);
                  }}
                />
              </View>
            </Pressable>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
