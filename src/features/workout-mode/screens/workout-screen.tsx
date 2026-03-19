import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DEFAULT_REST_SECONDS } from '@shared/constants';
import { useTheme } from '@core/theme/theme-context';
import { useActiveWorkout } from '../hooks/use-active-workout';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { usePreviousExercisePerformance } from '../hooks/use-previous-exercise-performance';
import { useWorkoutStore } from '../store';
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

const EXERCISE_TIMER_SECONDS = 60;
const SWIPE_ACTION_WIDTH = 72;

function formatVolume(value: number): string {
  return `${new Intl.NumberFormat('en-US').format(Math.round(value))} vol`;
}

function formatShortDate(timestamp: number | null): string {
  if (timestamp === null) {
    return 'No workouts yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(timestamp);
}

function formatPreviousPerformance(
  performance: PreviousExercisePerformance | null,
): string {
  if (!performance) {
    return 'No previous logged set';
  }

  return `Previous ${performance.reps} x ${performance.weight}`;
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
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [translateX]);

  const openSwipe = useCallback((): void => {
    Animated.spring(translateX, {
      toValue: -SWIPE_ACTION_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          gestureState.dx < -6,
        onPanResponderMove: (_, gestureState) => {
          translateX.setValue(
            Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, gestureState.dx)),
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -SWIPE_ACTION_WIDTH / 2) {
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
        className="absolute bottom-0 right-0 top-0 w-[72px] items-center justify-center rounded-[16px] bg-destructive"
        onPress={() => {
          closeSwipe();
          onDelete();
        }}
      >
        <Body className="text-sm font-semibold text-background">Delete</Body>
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
              setItem.isCompleted ? 'text-black' : 'text-foreground'
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
  const { tokens } = useTheme();
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
      backgroundBlur="light"
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
  exerciseTimerLabel,
  onOpenDetails,
  onDelete,
  onToggleExerciseTimer,
  children,
}: {
  title: string;
  exerciseId: string;
  previousPerformanceLabel: string;
  exerciseTimerLabel: string | null;
  onOpenDetails: (exerciseId: string) => void;
  onDelete: () => void;
  onToggleExerciseTimer: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const handleOpenOptions = useCallback((): void => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: ['View Details', 'Delete Exercise', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          userInterfaceStyle: 'light',
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
  }, [exerciseId, onDelete, onOpenDetails, title]);

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
            accessibilityLabel={
              exerciseTimerLabel
                ? `Clear ${title} timer`
                : `Start ${title} timer`
            }
            className={`rounded-[12px] border px-3 py-2 ${
              exerciseTimerLabel
                ? 'border-secondary bg-secondary/10'
                : 'border-surface-border bg-surface-elevated'
            }`}
            onPress={onToggleExerciseTimer}
          >
            <Body
              className={`text-sm font-semibold ${
                exerciseTimerLabel ? 'text-secondary' : 'text-foreground'
              }`}
            >
              {exerciseTimerLabel
                ? `Timer ${exerciseTimerLabel}`
                : 'Timer 1:00'}
            </Body>
          </Pressable>
        </View>
      </View>
      {children}
    </View>
  );
}

interface ActiveWorkoutContentProps {
  activeSession: NonNullable<
    ReturnType<typeof useActiveWorkout>['activeSession']
  >;
  sessionTitle: string;
  durationLabel: string;
  now: number;
  exerciseCount: number;
  setCount: number;
  volume: number;
  restLabel: string | null;
  onComplete: () => void;
  onDeleteWorkout: () => void;
  startRestTimer: (durationSeconds?: number) => void;
  clearRestTimer: () => void;
  onOpenExerciseDetails: (exerciseId: string) => void;
  onToggleExerciseTimer: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  addExercise: (exerciseId: string, exerciseName: string) => void;
  removeExercise: (exerciseId: string) => void;
  deleteSet: (setId: string) => void;
  updateReps: (setId: string, reps: number) => void;
  updateWeight: (setId: string, weight: number) => void;
  toggleSetLogged: (setId: string, isCompleted: boolean) => void;
  exerciseTimerEndsAtByExerciseId: Record<string, number | null>;
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
  sessionTitle,
  durationLabel,
  now,
  exerciseCount,
  setCount,
  volume,
  restLabel,
  onComplete,
  onDeleteWorkout,
  startRestTimer,
  clearRestTimer,
  onOpenExerciseDetails,
  onToggleExerciseTimer,
  addSet,
  addExercise,
  removeExercise,
  deleteSet,
  updateReps,
  updateWeight,
  toggleSetLogged,
  exerciseTimerEndsAtByExerciseId,
  previousPerformanceByExerciseId,
  showExerciseSheet,
  setShowExerciseSheet,
  insets,
}: ActiveWorkoutContentProps): React.JSX.Element {
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
          stickyHeaderIndices={[0]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={{ paddingBottom: dockHeight + 8 }}
        >
          <View className="border-surface-border bg-surface">
            <Surface
              variant="card"
              className="rounded-none border-x-0 border-t-0 border-surface-border px-4 pb-4 pt-3"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Meta className="text-xs uppercase tracking-[1.2px]">
                    In Progress
                  </Meta>
                  <Heading className="mt-2 text-3xl leading-[30px]">
                    {sessionTitle}
                  </Heading>
                </View>
                {restLabel ? (
                  <View className="rounded-[14px] border border-secondary bg-secondary/10 px-3 py-2">
                    <Label className="text-secondary">Rest</Label>
                    <Body className="mt-1 text-base font-semibold text-secondary">
                      {restLabel}
                    </Body>
                  </View>
                ) : null}
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                <View className="min-w-[120px] flex-1 rounded-[16px] border border-surface-border bg-surface px-3 py-3">
                  <Label>Duration</Label>
                  <Heading className="mt-2 text-xl leading-[22px]">
                    {durationLabel}
                  </Heading>
                </View>
                <View className="min-w-[120px] flex-1 rounded-[16px] border border-surface-border bg-surface px-3 py-3">
                  <Label>Exercises</Label>
                  <Heading className="mt-2 text-xl leading-[22px]">
                    {exerciseCount}
                  </Heading>
                </View>
                <View className="min-w-[120px] flex-1 rounded-[16px] border border-surface-border bg-surface px-3 py-3">
                  <Label>Sets</Label>
                  <Heading className="mt-2 text-xl leading-[22px]">
                    {setCount}
                  </Heading>
                </View>
                <View className="min-w-[120px] flex-1 rounded-[16px] border border-surface-border bg-surface px-3 py-3">
                  <Label>Volume</Label>
                  <Heading className="mt-2 text-xl leading-[22px]">
                    {formatVolume(volume)}
                  </Heading>
                </View>
              </View>

              <View className="mt-4 flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    restLabel
                      ? `Restart rest timer ${restLabel}`
                      : 'Start rest timer'
                  }
                  className={`rounded-[14px] border px-4 py-3 ${
                    restLabel
                      ? 'border-secondary bg-secondary/10'
                      : 'border-surface-border bg-surface'
                  }`}
                  onPress={() => startRestTimer(DEFAULT_REST_SECONDS)}
                >
                  <Body
                    className={`text-sm font-semibold ${
                      restLabel ? 'text-secondary' : 'text-foreground'
                    }`}
                  >
                    {restLabel
                      ? `Restart Rest ${restLabel}`
                      : 'Start Rest 1:30'}
                  </Body>
                </Pressable>

                {restLabel ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear rest timer"
                    className="rounded-[14px] border border-surface-border bg-surface px-4 py-3"
                    onPress={clearRestTimer}
                  >
                    <Body className="text-sm font-semibold text-foreground">
                      Clear
                    </Body>
                  </Pressable>
                ) : null}
              </View>
            </Surface>
          </View>

          {activeSession.exercises.length > 0 ? (
            activeSession.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.exerciseId}
                title={exercise.exerciseName}
                exerciseId={exercise.exerciseId}
                previousPerformanceLabel={formatPreviousPerformance(
                  previousPerformanceByExerciseId[exercise.exerciseId] ?? null,
                )}
                exerciseTimerLabel={
                  exerciseTimerEndsAtByExerciseId[exercise.exerciseId] &&
                  (exerciseTimerEndsAtByExerciseId[exercise.exerciseId] ?? 0) >
                    now
                    ? formatRestCountdown(
                        (exerciseTimerEndsAtByExerciseId[exercise.exerciseId] ??
                          0) - now,
                      )
                    : null
                }
                onOpenDetails={onOpenExerciseDetails}
                onDelete={() => removeExercise(exercise.exerciseId)}
                onToggleExerciseTimer={() =>
                  onToggleExerciseTimer(exercise.exerciseId)
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
                      toggleSetLogged(setItem.id, isCompleted)
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
              className="h-11 min-w-[76px] items-center justify-center rounded-[14px] border border-destructive bg-surface-card px-3"
              onPress={onDeleteWorkout}
            >
              <Body className="text-sm font-semibold text-destructive">
                Delete
              </Body>
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
  const insets = useSafeAreaInsets();
  const {
    isWorkoutActive,
    isWorkoutCollapsed,
    startTime,
    restTimerEndsAt,
    collapseWorkout,
    startRestTimer,
    clearRestTimer,
  } = useWorkoutStore(
    useShallow((state) => ({
      isWorkoutActive: state.isWorkoutActive,
      isWorkoutCollapsed: state.isWorkoutCollapsed,
      startTime: state.startTime,
      restTimerEndsAt: state.restTimerEndsAt,
      collapseWorkout: state.collapseWorkout,
      startRestTimer: state.startRestTimer,
      clearRestTimer: state.clearRestTimer,
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
  const [exerciseTimerEndsAtByExerciseId, setExerciseTimerEndsAtByExerciseId] =
    useState<Record<string, number | null>>({});
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
    if (!activeSession) {
      setExerciseTimerEndsAtByExerciseId({});
      return;
    }

    setExerciseTimerEndsAtByExerciseId((currentTimers) =>
      Object.fromEntries(
        activeSession.exercises
          .map((exercise) => [
            exercise.exerciseId,
            currentTimers[exercise.exerciseId] ?? null,
          ])
          .filter((entry) => entry[0] !== undefined),
      ),
    );
  }, [activeSession]);

  if (!isWorkoutActive || isWorkoutCollapsed || !activeSession) {
    return null;
  }

  const sessionTitle = activeSession.title ?? 'Workout';
  const durationLabel =
    startTime !== null ? formatElapsedDuration(now - startTime) : '0m';
  const exerciseCount = activeSession.exercises.length;
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
      sessionTitle={sessionTitle}
      durationLabel={durationLabel}
      now={now}
      exerciseCount={exerciseCount}
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
      onToggleExerciseTimer={(exerciseId) => {
        setExerciseTimerEndsAtByExerciseId((currentTimers) => {
          const existingEnd = currentTimers[exerciseId] ?? null;
          const isActive = existingEnd !== null && existingEnd > Date.now();

          return {
            ...currentTimers,
            [exerciseId]: isActive
              ? null
              : Date.now() + EXERCISE_TIMER_SECONDS * 1000,
          };
        });
      }}
      addSet={addSet}
      addExercise={addExercise}
      removeExercise={removeExercise}
      deleteSet={deleteSet}
      updateReps={updateReps}
      updateWeight={updateWeight}
      toggleSetLogged={toggleSetLogged}
      exerciseTimerEndsAtByExerciseId={exerciseTimerEndsAtByExerciseId}
      previousPerformanceByExerciseId={previousPerformanceByExerciseId}
      showExerciseSheet={showExerciseSheet}
      setShowExerciseSheet={setShowExerciseSheet}
      insets={insets}
    />
  );
}
