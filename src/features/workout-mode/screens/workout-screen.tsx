import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActionSheetIOS,
  Animated,
  Alert,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList, RootTabParamList } from '@core/navigation';
import {
  buildDashboardMetrics,
  useHistoryAnalytics,
} from '@features/analytics';
import { useUserProfile } from '@features/health-tracking';
import { useExercises } from '@features/routines';
import {
  Body,
  Button,
  Caption,
  Container,
  DisplayHeading,
  Heading,
  Label,
  Meta,
  Muted,
  Surface,
} from '@shared/components';
import { useTheme } from '@core/theme/theme-context';
import { useActiveWorkout } from '../hooks/use-active-workout';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { usePreviousExercisePerformance } from '../hooks/use-previous-exercise-performance';
import { DEFAULT_EXERCISE_TIMER_SECONDS, useWorkoutStore } from '../store';
import {
  type ActiveWorkoutSet,
  type PreviousExercisePerformance,
} from '../types';

type WorkoutHomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Workout'>,
  NativeStackScreenProps<RootStackParamList>
>;

type WorkoutActiveScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ActiveWorkout'
>;

function parseWholeNumber(value: string): number {
  if (value.trim() === '') {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseDecimalNumber(value: string): number {
  if (value.trim() === '') {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatElapsedDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  return `${minutes}m`;
}

function formatRestCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const SWIPE_ACTION_WIDTH = 72;
const EXERCISE_TIMER_OPTIONS = [30, 60, 90, 120] as const;

function formatShortDate(timestamp: number | null): string {
  if (timestamp === null) {
    return 'No workouts yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
}

function formatTimerDuration(seconds: number): string {
  return formatRestCountdown(seconds * 1000);
}

function formatPreviousPerformance(
  performance: PreviousExercisePerformance | null,
): string {
  if (!performance) {
    return 'No previous logged set';
  }

  return `Previous ${performance.reps} x ${performance.weight}`;
}

function countCompletedExercises(
  exercises: NonNullable<
    ReturnType<typeof useActiveWorkout>['activeSession']
  >['exercises'],
): number {
  return exercises.filter(
    (exercise) =>
      exercise.sets.length > 0 &&
      exercise.sets.every((setItem) => setItem.isCompleted),
  ).length;
}

function isExerciseDetailNavigationAction(action: unknown): boolean {
  if (
    typeof action !== 'object' ||
    action === null ||
    !('type' in action) ||
    !('payload' in action)
  ) {
    return false;
  }

  const typedAction = action as {
    type?: string;
    payload?: { name?: string };
  };

  return (
    typedAction.type === 'NAVIGATE' &&
    typedAction.payload?.name === 'ExerciseDetail'
  );
}

function getGreeting(
  displayName: string | null,
  now: number,
): {
  title: string;
  subtitle: string;
} {
  const hour = new Date(now).getHours();
  const name = displayName?.trim() ?? '';
  const suffix = name === '' ? '' : `, ${name}`;

  if (hour < 12) {
    return {
      title: `Good morning${suffix}`,
      subtitle: 'Set the tone early and get the next session moving.',
    };
  }

  if (hour < 18) {
    return {
      title: `Welcome back${suffix}`,
      subtitle: 'Your training week is in motion. Pick up where you left off.',
    };
  }

  return {
    title: `Good evening${suffix}`,
    subtitle: 'Close the day with a session review or one more workout.',
  };
}

function DashboardStatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string | number;
  caption: string;
}): React.JSX.Element {
  return (
    <Surface
      variant="card"
      className="w-full rounded-[22px] border border-surface-border px-4 py-4"
    >
      <Label>{label}</Label>
      <DisplayHeading className="mt-3 text-3xl leading-[30px]">
        {value}
      </DisplayHeading>
      <Caption className="mt-2">{caption}</Caption>
    </Surface>
  );
}

function WorkoutSetRow({
  exerciseName,
  setItem,
  index,
  onDelete,
  onUpdateReps,
  onUpdateWeight,
  onToggleLogged,
}: {
  exerciseName: string;
  setItem: ActiveWorkoutSet;
  index: number;
  onDelete: () => void;
  onUpdateReps: (reps: number) => void;
  onUpdateWeight: (weight: number) => void;
  onToggleLogged: (isCompleted: boolean) => void;
}): React.JSX.Element {
  const { tokens } = useTheme();
  const [repsText, setRepsText] = useState(String(setItem.reps));
  const [weightText, setWeightText] = useState(String(setItem.weight));
  const translateX = React.useRef(new Animated.Value(0)).current;
  const offsetRef = React.useRef(0);
  const dragStartOffsetRef = React.useRef(0);
  const [isDeleteActionVisible, setIsDeleteActionVisible] = useState(false);

  useEffect(() => {
    setRepsText(String(setItem.reps));
  }, [setItem.reps]);

  useEffect(() => {
    setWeightText(String(setItem.weight));
  }, [setItem.weight]);

  const handlePersistReps = useCallback((): void => {
    onUpdateReps(parseWholeNumber(repsText));
  }, [onUpdateReps, repsText]);

  const handlePersistWeight = useCallback((): void => {
    onUpdateWeight(parseDecimalNumber(weightText));
  }, [onUpdateWeight, weightText]);

  const closeSwipe = useCallback((): void => {
    offsetRef.current = 0;
    setIsDeleteActionVisible(false);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [translateX]);

  const openSwipe = useCallback((): void => {
    offsetRef.current = -SWIPE_ACTION_WIDTH;
    setIsDeleteActionVisible(true);
    Animated.spring(translateX, {
      toValue: -SWIPE_ACTION_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onPanResponderGrant: () => {
          dragStartOffsetRef.current = offsetRef.current;
        },
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          (gestureState.dx < -6 ||
            (offsetRef.current < 0 && gestureState.dx > 6)),
        onPanResponderMove: (_, gestureState) => {
          const nextOffset = Math.max(
            -SWIPE_ACTION_WIDTH,
            Math.min(0, dragStartOffsetRef.current + gestureState.dx),
          );
          translateX.setValue(nextOffset);
          setIsDeleteActionVisible(nextOffset < -4);
        },
        onPanResponderRelease: (_, gestureState) => {
          const finalOffset = Math.max(
            -SWIPE_ACTION_WIDTH,
            Math.min(0, dragStartOffsetRef.current + gestureState.dx),
          );

          if (finalOffset <= -SWIPE_ACTION_WIDTH / 2) {
            openSwipe();
            return;
          }

          closeSwipe();
        },
        onPanResponderTerminate: closeSwipe,
      }),
    [closeSwipe, openSwipe, translateX],
  );

  return (
    <View className="mb-2.5 overflow-hidden rounded-[16px]">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${exerciseName} set ${index + 1}`}
        accessibilityElementsHidden={!isDeleteActionVisible}
        importantForAccessibility={
          isDeleteActionVisible ? 'yes' : 'no-hide-descendants'
        }
        testID={`delete-set-${setItem.id}`}
        className="absolute bottom-0 right-0 top-0 w-[72px] items-center justify-center rounded-[16px] bg-error"
        onPress={() => {
          closeSwipe();
          onDelete();
        }}
      >
        <Body className="text-sm font-semibold text-error-foreground">
          Delete
        </Body>
      </Pressable>

      <Animated.View
        className="flex-row items-center gap-2 rounded-[16px] border border-surface-border bg-surface-elevated px-3 py-3"
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-card">
          <Body className="text-sm font-semibold text-foreground">
            {index + 1}
          </Body>
        </View>
        <TextInput
          className="h-11 flex-1 rounded-[12px] border border-surface-border bg-surface-card px-3 py-0 font-body text-sm text-foreground"
          value={repsText}
          onChangeText={setRepsText}
          onEndEditing={handlePersistReps}
          onSubmitEditing={handlePersistReps}
          keyboardType="number-pad"
          returnKeyType="done"
          accessibilityLabel={`${exerciseName} set ${index + 1} reps`}
          placeholderTextColor={tokens.textMuted}
        />
        <TextInput
          className="h-11 flex-1 rounded-[12px] border border-surface-border bg-surface-card px-3 py-0 font-body text-sm text-foreground"
          value={weightText}
          onChangeText={setWeightText}
          onEndEditing={handlePersistWeight}
          onSubmitEditing={handlePersistWeight}
          keyboardType="decimal-pad"
          returnKeyType="done"
          accessibilityLabel={`${exerciseName} set ${index + 1} weight`}
          placeholderTextColor={tokens.textMuted}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${setItem.isCompleted ? 'Unlog' : 'Log'} ${exerciseName} set ${index + 1}`}
          className={`h-11 min-w-[58px] items-center justify-center rounded-[12px] border px-3 ${
            setItem.isCompleted
              ? 'border-accent bg-accent'
              : 'border-surface-border bg-surface-card'
          }`}
          onPress={() => onToggleLogged(!setItem.isCompleted)}
        >
          <Text
            className={`font-body text-sm font-semibold ${
              setItem.isCompleted
                ? 'text-accent-foreground'
                : 'text-foreground'
            }`}
          >
            Log
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ExercisePickerRow({
  exerciseName,
  muscleGroup,
  onPress,
}: {
  exerciseName: string;
  muscleGroup: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${exerciseName}`}
      className="p-3"
      onPress={onPress}
    >
      <Text className="text-sm text-foreground">{exerciseName}</Text>
      <Muted className="mt-0.5 text-2xs uppercase tracking-[1px]">
        {muscleGroup}
      </Muted>
    </Pressable>
  );
}

function ExercisePickerBottomSheet({
  visible,
  exerciseIdsInSession,
  onClose,
  onAddExercise,
}: {
  visible: boolean;
  exerciseIdsInSession: string[];
  onClose: () => void;
  onAddExercise: (exerciseId: string, exerciseName: string) => void;
}): React.JSX.Element {
  const { colorMode, tokens } = useTheme();
  const { exercises, hasLoaded } = useExercises();
  const sheetRef = React.useRef<TrueSheet>(null);
  const isPresentedRef = React.useRef(false);
  const isTransitioningRef = React.useRef(false);
  const latestVisibleRef = React.useRef(visible);
  const [searchQuery, setSearchQuery] = useState('');

  const availableExercises = useMemo(
    () =>
      exercises.filter(
        (exercise) => !exerciseIdsInSession.includes(exercise.id),
      ),
    [exerciseIdsInSession, exercises],
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredExercises = useMemo(
    () =>
      availableExercises.filter((exercise) => {
        if (normalizedSearchQuery === '') {
          return true;
        }

        return (
          exercise.name.toLowerCase().includes(normalizedSearchQuery) ||
          exercise.muscle_group.toLowerCase().includes(normalizedSearchQuery)
        );
      }),
    [availableExercises, normalizedSearchQuery],
  );

  useEffect(() => {
    latestVisibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (isPresentedRef.current || isTransitioningRef.current) {
        return;
      }

      isTransitioningRef.current = true;
      void sheetRef.current?.present().catch(() => {
        isTransitioningRef.current = false;
      });

      return;
    }

    if (!isPresentedRef.current || isTransitioningRef.current) {
      return;
    }

    isTransitioningRef.current = true;
    void sheetRef.current?.dismiss().catch(() => {
      isTransitioningRef.current = false;
    });
  }, [visible]);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={['auto', 1]}
      cornerRadius={28}
      grabber
      scrollable
      backgroundColor={tokens.bgBase}
      backgroundBlur={colorMode === 'dark' ? 'dark' : 'light'}
      onDidPresent={() => {
        isPresentedRef.current = true;
        isTransitioningRef.current = false;
      }}
      onDidDismiss={() => {
        isPresentedRef.current = false;
        isTransitioningRef.current = false;

        if (latestVisibleRef.current) {
          onClose();
        }
      }}
    >
      <View>
        <View className="p-4">
          <Heading className="text-lg leading-[20px]">Add Exercise</Heading>
          <Muted className="mt-1 text-xs leading-[15px]">
            Pick an exercise to bring into the current session.
          </Muted>
          <TextInput
            accessibilityLabel="Search exercises"
            className="mt-4 h-12 rounded-[14px] border border-surface-border bg-surface-card px-4 py-0 font-body text-base text-foreground"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises"
            placeholderTextColor={tokens.textMuted}
            returnKeyType="search"
          />
        </View>

        {!hasLoaded ? (
          <View className="bg-surface-card px-4 py-4">
            <Muted className="text-sm">Loading exercises...</Muted>
          </View>
        ) : availableExercises.length === 0 ? (
          <View className="bg-surface-card px-4 py-4">
            <Muted className="text-sm">All exercises are already added.</Muted>
          </View>
        ) : filteredExercises.length === 0 ? (
          <View className="bg-surface-card px-4 py-4">
            <Muted className="text-sm">No exercises match your search.</Muted>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            keyExtractor={(exercise) => exercise.id}
            renderItem={({ item }) => (
              <ExercisePickerRow
                exerciseName={item.name}
                muscleGroup={item.muscle_group}
                onPress={() => {
                  onAddExercise(item.id, item.name);
                  onClose();
                }}
              />
            )}
          />
        )}
      </View>
    </TrueSheet>
  );
}

function ExerciseCard({
  title,
  exerciseId,
  previousPerformanceLabel,
  exerciseTimerDisplayLabel,
  isExerciseTimerActive,
  onOpenDetails,
  onDelete,
  onToggleExerciseTimer,
  children,
}: {
  title: string;
  exerciseId: string;
  previousPerformanceLabel: string;
  exerciseTimerDisplayLabel: string;
  isExerciseTimerActive: boolean;
  onOpenDetails: (exerciseId: string) => void;
  onDelete: () => void;
  onToggleExerciseTimer: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const { colorMode } = useTheme();

  const handleOpenOptions = useCallback((): void => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: ['View Details', 'Delete Exercise', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          userInterfaceStyle: colorMode,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            onOpenDetails(exerciseId);
          }

          if (buttonIndex === 1) {
            onDelete();
          }
        },
      );
      return;
    }

    Alert.alert(title, undefined, [
      {
        text: 'View Details',
        onPress: () => onOpenDetails(exerciseId),
      },
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Exercise',
        style: 'destructive',
        onPress: onDelete,
      },
    ]);
  }, [colorMode, exerciseId, onDelete, onOpenDetails, title]);

  return (
    <View className="mt-3 overflow-hidden rounded-[22px] border border-surface-border bg-surface-card p-4">
      <View className="relative border-b border-surface-border/80 pb-3">
        <View className="flex-row items-center justify-between gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View details for ${title}`}
            className="flex-1"
            onPress={() => onOpenDetails(exerciseId)}
          >
            <Heading className="text-lg leading-[20px]">{title}</Heading>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Options for ${title}`}
            className="h-8 w-8 items-center justify-center rounded-[10px] border border-surface-border bg-surface-card"
            onPress={handleOpenOptions}
          >
            <Text className="font-mono text-sm tracking-[-1px] text-muted">
              ...
            </Text>
          </Pressable>
        </View>
        <View className="mt-3 flex-row items-center justify-between gap-3">
          <Muted className="flex-1 text-sm">{previousPerformanceLabel}</Muted>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title} timer options`}
            accessibilityHint={`Choose the timer duration for ${title}. Current setting: ${exerciseTimerDisplayLabel}.`}
            className={`rounded-[12px] px-3 py-2 ${isExerciseTimerActive ? 'bg-secondary/10' : 'bg-surface-elevated'}`}
            onPress={onToggleExerciseTimer}
          >
            <Body
              className={`text-sm font-semibold ${
                isExerciseTimerActive ? 'text-secondary' : 'text-foreground'
              }`}
            >
              {exerciseTimerDisplayLabel}
            </Body>
          </Pressable>
        </View>
      </View>
      {children}
    </View>
  );
}

function WorkoutHeaderTitle({
  title,
  completedExerciseCount,
  totalExerciseCount,
}: {
  title: string;
  completedExerciseCount: number;
  totalExerciseCount: number;
}): React.JSX.Element {
  return (
    <View className="max-w-[220px]">
      <Text numberOfLines={1} className="font-heading text-lg text-foreground">
        {title}
      </Text>
      <Text numberOfLines={1} className="mt-0.5 font-body text-xs text-muted">
        {completedExerciseCount}/{totalExerciseCount} exercises
      </Text>
    </View>
  );
}

function WorkoutHeaderRight({
  durationLabel,
}: {
  durationLabel: string;
}): React.JSX.Element {
  return (
    <Text className="p-2 font-heading text-lg text-foreground">
      {durationLabel}
    </Text>
  );
}

interface ActiveWorkoutContentProps {
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

function ActiveWorkoutContent({
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
                  className="mt-1 self-start rounded-[12px] border border-surface-border bg-surface-elevated px-3 py-2"
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
              className="h-11 w-11 items-center justify-center rounded-[14px] border border-surface-border bg-surface-card"
              onPress={() => setShowExerciseSheet(true)}
            >
              <Text className="font-mono text-xl text-foreground">+</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete workout"
              className="h-11 w-11 items-center justify-center rounded-[14px] border border-surface-border bg-surface-card px-3"
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

export function WorkoutScreen({
  navigation,
}: WorkoutHomeScreenProps): React.JSX.Element {
  const {
    currentWorkoutTitle,
    currentExerciseCount,
    expandWorkout,
    isWorkoutActive,
  } = useWorkoutStore(
    useShallow((state) => ({
      currentWorkoutTitle: state.activeSession?.title ?? null,
      currentExerciseCount: state.activeSession?.exercises.length ?? 0,
      expandWorkout: state.expandWorkout,
      isWorkoutActive: state.isWorkoutActive,
    })),
  );
  const {
    refreshPreview,
    nextRoutine,
    startWorkoutFromSchedule,
    startFreeWorkout,
  } = useWorkoutStarter();
  const { sessions, refresh: refreshHistory } = useHistoryAnalytics();
  const { profile, refresh: refreshProfile } = useUserProfile();
  const [starting, setStarting] = useState(false);
  const [dashboardNow] = useState(() => Date.now());
  const greeting = getGreeting(profile?.displayName ?? null, dashboardNow);
  const dashboardMetrics = useMemo(
    () => buildDashboardMetrics(sessions, { now: dashboardNow }),
    [dashboardNow, sessions],
  );

  const hasCurrentWorkout = isWorkoutActive && currentWorkoutTitle !== null;
  const inactiveSubtitle = hasCurrentWorkout
    ? 'Your current workout is still in progress.'
    : nextRoutine
      ? `Your next workout is ready, ${nextRoutine.routineName}.`
      : 'Your next workout will appear here once a schedule is active.';

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshPreview();
      refreshHistory();
      refreshProfile();
    });

    return unsubscribe;
  }, [navigation, refreshHistory, refreshPreview, refreshProfile]);

  const handleStartScheduled = (): void => {
    if (starting) {
      return;
    }

    setStarting(true);

    try {
      const sessionId = startWorkoutFromSchedule();
      if (sessionId) {
        navigation.navigate('ActiveWorkout');
      }
    } finally {
      setStarting(false);
    }
  };

  const handleStartFree = (): void => {
    if (starting) {
      return;
    }

    setStarting(true);

    try {
      startFreeWorkout();
      navigation.navigate('ActiveWorkout');
    } finally {
      setStarting(false);
    }
  };

  const handleContinueWorkout = (): void => {
    expandWorkout();
    navigation.navigate('ActiveWorkout');
  };

  return (
    <Container className="px-0 pb-0" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 0,
          paddingTop: 0,
          paddingBottom: 24,
          gap: 12,
        }}
      >
        <View className="gap-2 pb-1" accessibilityRole="header">
          <Label className="uppercase tracking-[1.5px]">Home</Label>
          <Heading className="text-4xl leading-[36px]">
            {greeting.title}
          </Heading>
          <Muted className="max-w-[320px]">{greeting.subtitle}</Muted>
        </View>

        {hasCurrentWorkout && currentWorkoutTitle ? (
          <Surface
            variant="card"
            className="w-full rounded-[22px] border border-surface-border p-5"
          >
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Label className="text-secondary">Current Workout</Label>
              <Meta>In progress</Meta>
            </View>
            <DisplayHeading className="text-3xl leading-[32px]">
              {currentWorkoutTitle}
            </DisplayHeading>
            <Muted className="mt-3">
              {currentExerciseCount} exercises in this session. Collapse it
              anytime and return here when you are ready.
            </Muted>
          </Surface>
        ) : nextRoutine ? (
          <Surface
            variant="card"
            className="w-full rounded-[22px] border border-surface-border p-5"
          >
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Label className="text-secondary">Next Workout</Label>
              <Meta>{nextRoutine.scheduleName}</Meta>
            </View>
            <DisplayHeading className="text-3xl leading-[32px]">
              {nextRoutine.routineName}
            </DisplayHeading>
            <Muted className="mt-3">
              {nextRoutine.exerciseCount} exercises • ~
              {nextRoutine.estimatedMinutes} mins
            </Muted>
            <Muted className="mt-2">{inactiveSubtitle}</Muted>
          </Surface>
        ) : (
          <Surface
            variant="card"
            className="w-full rounded-[22px] border border-surface-border p-5"
          >
            <Heading className="text-2xl leading-[24px]">
              No active schedule
            </Heading>
            <Muted className="mt-2">
              Create a schedule to queue your next workout, or start a free
              session now.
            </Muted>
          </Surface>
        )}

        {hasCurrentWorkout ? (
          <Button onPress={handleContinueWorkout} className="w-full">
            Continue
          </Button>
        ) : nextRoutine ? (
          <Button
            onPress={handleStartScheduled}
            disabled={starting}
            loading={starting}
            className="w-full"
          >
            Start {nextRoutine.routineName}
          </Button>
        ) : null}

        {!hasCurrentWorkout ? (
          <Button
            variant="ghost"
            onPress={handleStartFree}
            disabled={starting}
            loading={starting}
            className="w-full"
          >
            Start Free Workout
          </Button>
        ) : null}

        <View className="gap-3">
          <DashboardStatCard
            label="Workouts This Week"
            value={dashboardMetrics.workoutsThisWeek}
            caption={`${dashboardMetrics.workoutDaysThisWeek} active days`}
          />
          <DashboardStatCard
            label="Weekly Streak"
            value={dashboardMetrics.currentWeeklyStreak}
            caption={
              dashboardMetrics.currentWeeklyStreak === 1
                ? '1 week in a row'
                : `${dashboardMetrics.currentWeeklyStreak} weeks in a row`
            }
          />
          <DashboardStatCard
            label="Last Workout"
            value={formatShortDate(dashboardMetrics.lastCompletedWorkoutAt)}
            caption="Most recent completed session"
          />
        </View>
      </ScrollView>
    </Container>
  );
}

export function WorkoutActiveScreen({
  navigation,
}: WorkoutActiveScreenProps): React.JSX.Element | null {
  const { colorMode } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    isWorkoutActive,
    isWorkoutCollapsed,
    startTime,
    restTimerEndsAt,
    collapseWorkout,
    startRestTimer,
    clearRestTimer,
    exerciseTimerEndsAtByExerciseId,
    exerciseTimerDurationByExerciseId,
    startExerciseTimer,
    clearExerciseTimer,
    setExerciseTimerDuration,
  } = useWorkoutStore(
    useShallow((state) => ({
      isWorkoutActive: state.isWorkoutActive,
      isWorkoutCollapsed: state.isWorkoutCollapsed,
      startTime: state.startTime,
      restTimerEndsAt: state.restTimerEndsAt,
      collapseWorkout: state.collapseWorkout,
      startRestTimer: state.startRestTimer,
      clearRestTimer: state.clearRestTimer,
      exerciseTimerEndsAtByExerciseId: state.exerciseTimerEndsAtByExerciseId,
      exerciseTimerDurationByExerciseId:
        state.exerciseTimerDurationByExerciseId,
      startExerciseTimer: state.startExerciseTimer,
      clearExerciseTimer: state.clearExerciseTimer,
      setExerciseTimerDuration: state.setExerciseTimerDuration,
    })),
  );
  const {
    activeSession,
    addExercise,
    removeExercise,
    addSet,
    deleteSet,
    updateReps,
    updateWeight,
    toggleSetLogged,
    completeWorkout,
    deleteWorkout,
  } = useActiveWorkout();
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  const [allowExit, setAllowExit] = useState(false);
  const previousPerformanceByExerciseId = usePreviousExercisePerformance(
    activeSession?.id ?? null,
    activeSession?.exercises.map((exercise) => exercise.exerciseId) ?? [],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (
        allowExit ||
        !isWorkoutActive ||
        isWorkoutCollapsed ||
        isExerciseDetailNavigationAction(event.data.action)
      ) {
        return;
      }

      event.preventDefault();
      collapseWorkout();
      navigation.dispatch(event.data.action);
    });

    return unsubscribe;
  }, [
    allowExit,
    collapseWorkout,
    isWorkoutActive,
    isWorkoutCollapsed,
    navigation,
  ]);

  useEffect(() => {
    if (!isWorkoutActive || isWorkoutCollapsed) {
      navigation.navigate('Tabs', { screen: 'Workout' });
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorkoutActive, isWorkoutCollapsed, navigation]);

  useEffect(() => {
    if (restTimerEndsAt !== null && restTimerEndsAt <= now) {
      clearRestTimer();
    }
  }, [clearRestTimer, now, restTimerEndsAt]);

  useEffect(() => {
    for (const [exerciseId, endsAt] of Object.entries(
      exerciseTimerEndsAtByExerciseId,
    )) {
      if (endsAt !== null && endsAt <= now) {
        clearExerciseTimer(exerciseId);
      }
    }
  }, [clearExerciseTimer, exerciseTimerEndsAtByExerciseId, now]);

  const sessionTitle = activeSession?.title ?? 'Workout';
  const durationLabel =
    startTime !== null ? formatElapsedDuration(now - startTime) : '0m';
  const totalExerciseCount = activeSession?.exercises.length ?? 0;
  const completedExerciseCount = activeSession
    ? countCompletedExercises(activeSession.exercises)
    : 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerTitleAlign: 'left',
      headerShadowVisible: false,
      headerTransparent: true,
      headerTitle: () => (
        <WorkoutHeaderTitle
          title={sessionTitle}
          completedExerciseCount={completedExerciseCount}
          totalExerciseCount={totalExerciseCount}
        />
      ),
      headerRight: () => <WorkoutHeaderRight durationLabel={durationLabel} />,
    });
  }, [
    completedExerciseCount,
    durationLabel,
    navigation,
    sessionTitle,
    totalExerciseCount,
  ]);

  if (!isWorkoutActive || isWorkoutCollapsed || !activeSession) {
    return null;
  }

  const setCount = activeSession.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.length,
    0,
  );
  const volume = activeSession.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce(
        (setSum, setItem) => setSum + setItem.weight * setItem.reps,
        0,
      ),
    0,
  );
  const restLabel =
    restTimerEndsAt !== null
      ? formatRestCountdown(restTimerEndsAt - now)
      : null;
  const showExerciseTimerOptions = (exerciseId: string): void => {
    const durationSeconds =
      exerciseTimerDurationByExerciseId[exerciseId] ??
      DEFAULT_EXERCISE_TIMER_SECONDS;
    const exerciseName =
      activeSession.exercises.find(
        (exercise) => exercise.exerciseId === exerciseId,
      )?.exerciseName ?? 'Exercise';

    if (Platform.OS === 'ios') {
      const options = [
        ...EXERCISE_TIMER_OPTIONS.map(
          (seconds) =>
            `${seconds} sec${seconds === durationSeconds ? ' ✓' : ''}`,
        ),
        'Clear Timer',
        'Cancel',
      ];
      const cancelButtonIndex = options.length - 1;
      const clearButtonIndex = options.length - 2;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `${exerciseName} timer`,
          message: 'Choose the timer duration for this exercise.',
          options,
          cancelButtonIndex,
          destructiveButtonIndex: clearButtonIndex,
          userInterfaceStyle: colorMode,
        },
        (buttonIndex) => {
          if (buttonIndex === cancelButtonIndex) {
            return;
          }

          if (buttonIndex === clearButtonIndex) {
            clearExerciseTimer(exerciseId);
            return;
          }

          const nextDuration = EXERCISE_TIMER_OPTIONS[buttonIndex];
          if (!nextDuration) {
            return;
          }

          setExerciseTimerDuration(exerciseId, nextDuration);
          startExerciseTimer(exerciseId, nextDuration);
        },
      );
      return;
    }

    Alert.alert(
      `${exerciseName} timer`,
      'Choose the timer duration for this exercise.',
      [
        ...EXERCISE_TIMER_OPTIONS.map((seconds) => ({
          text: `${seconds} sec`,
          onPress: () => {
            setExerciseTimerDuration(exerciseId, seconds);
            startExerciseTimer(exerciseId, seconds);
          },
        })),
        {
          text: 'Clear Timer',
          style: 'destructive' as const,
          onPress: () => {
            clearExerciseTimer(exerciseId);
          },
        },
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };
  const handleDeleteWorkout = (): void => {
    Alert.alert(
      'Delete workout?',
      'This removes the in-progress session and all logged sets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Workout',
          style: 'destructive',
          onPress: () => {
            if (deleteWorkout()) {
              setAllowExit(true);
              navigation.navigate('Tabs', { screen: 'Workout' });
            }
          },
        },
      ],
    );
  };

  return (
    <ActiveWorkoutContent
      activeSession={activeSession}
      now={now}
      setCount={setCount}
      volume={volume}
      restLabel={restLabel}
      onComplete={() => {
        if (completeWorkout()) {
          setAllowExit(true);
          navigation.navigate('Tabs', { screen: 'Workout' });
        }
      }}
      onDeleteWorkout={handleDeleteWorkout}
      startRestTimer={startRestTimer}
      clearRestTimer={clearRestTimer}
      onOpenExerciseDetails={(exerciseId) =>
        navigation.navigate('ExerciseDetail', { exerciseId })
      }
      onOpenExerciseTimerOptions={showExerciseTimerOptions}
      addSet={addSet}
      addExercise={addExercise}
      removeExercise={removeExercise}
      deleteSet={deleteSet}
      updateReps={updateReps}
      updateWeight={updateWeight}
      toggleSetLogged={(exerciseId, setId, isCompleted) => {
        toggleSetLogged(setId, isCompleted);

        if (!isCompleted) {
          return;
        }

        const durationSeconds =
          exerciseTimerDurationByExerciseId[exerciseId] ??
          DEFAULT_EXERCISE_TIMER_SECONDS;
        startExerciseTimer(exerciseId, durationSeconds);
      }}
      exerciseTimerEndsAtByExerciseId={exerciseTimerEndsAtByExerciseId}
      exerciseTimerDurationByExerciseId={exerciseTimerDurationByExerciseId}
      previousPerformanceByExerciseId={previousPerformanceByExerciseId}
      showExerciseSheet={showExerciseSheet}
      setShowExerciseSheet={setShowExerciseSheet}
      insets={insets}
    />
  );
}
