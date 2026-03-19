import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootTabParamList } from '@core/navigation';
import { useExercises } from '@features/routines';
import {
  Body,
  Button,
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
import { useWorkoutStore } from '../store';
import { type ActiveWorkoutSet } from '../types';

type WorkoutHomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Workout'>;

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

function formatVolume(value: number): string {
  return `${new Intl.NumberFormat('en-US').format(Math.round(value))} vol`;
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

  return (
    <View className="mb-2.5 flex-row items-center gap-2 rounded-[16px] border border-surface-border bg-surface-elevated px-3 py-3">
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${exerciseName} set ${index + 1}`}
        className="h-11 w-11 items-center justify-center rounded-[12px] border border-surface-border bg-surface-card"
        onPress={onDelete}
      >
        <Text className="font-mono text-sm text-muted">×</Text>
      </Pressable>
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
  const { exercises } = useExercises();
  const sheetRef = React.useRef<TrueSheet>(null);
  const isPresentedRef = React.useRef(false);
  const isTransitioningRef = React.useRef(false);
  const latestVisibleRef = React.useRef(visible);

  const availableExercises = exercises.filter(
    (exercise) => !exerciseIdsInSession.includes(exercise.id),
  );

  useEffect(() => {
    latestVisibleRef.current = visible;
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
        </View>

        {availableExercises.length === 0 ? (
          <View className="bg-surface-card px-4 py-4">
            <Muted className="text-xs">All exercises are already added.</Muted>
          </View>
        ) : (
          <FlatList
            data={availableExercises}
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
  onDelete,
  children,
}: {
  title: string;
  onDelete: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const handleOpenOptions = useCallback((): void => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: ['Delete Exercise', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          userInterfaceStyle: 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            onDelete();
          }
        },
      );
      return;
    }

    Alert.alert(title, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Exercise',
        style: 'destructive',
        onPress: onDelete,
      },
    ]);
  }, [onDelete, title]);

  return (
    <View className="mt-3 overflow-hidden rounded-[22px] border border-surface-border bg-surface-card p-4">
      <View className="relative border-b border-surface-border/80 pb-3">
        <View className="flex-row items-center justify-between gap-3">
          <Heading className="flex-1 text-lg leading-[20px]">{title}</Heading>
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
  exerciseCount: number;
  setCount: number;
  volume: number;
  restLabel: string | null;
  onComplete: () => void;
  startRestTimer: (durationSeconds?: number) => void;
  clearRestTimer: () => void;
  addSet: (exerciseId: string) => void;
  addExercise: (exerciseId: string, exerciseName: string) => void;
  removeExercise: (exerciseId: string) => void;
  deleteSet: (setId: string) => void;
  updateReps: (setId: string, reps: number) => void;
  updateWeight: (setId: string, weight: number) => void;
  toggleSetLogged: (setId: string, isCompleted: boolean) => void;
  showExerciseSheet: boolean;
  setShowExerciseSheet: React.Dispatch<React.SetStateAction<boolean>>;
  insets: ReturnType<typeof useSafeAreaInsets>;
}

function ActiveWorkoutContent({
  activeSession,
  sessionTitle,
  durationLabel,
  exerciseCount,
  setCount,
  volume,
  restLabel,
  onComplete,
  startRestTimer,
  clearRestTimer,
  addSet,
  addExercise,
  removeExercise,
  deleteSet,
  updateReps,
  updateWeight,
  toggleSetLogged,
  showExerciseSheet,
  setShowExerciseSheet,
  insets,
}: ActiveWorkoutContentProps): React.JSX.Element {
  const dockOffset = Math.max(insets.bottom, 2);
  const dockHeight = 62 + dockOffset;

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
            <View className="px-2 py-2">
              <Heading className="text-2xl leading-[24px]">
                {sessionTitle}
              </Heading>
            </View>
            <View className="flex-row flex-wrap gap-x-2 gap-y-0.5 border-t border-surface-border px-2 py-1.5">
              <Meta className="text-2xs">{durationLabel}</Meta>
              <Meta className="text-2xs">{exerciseCount} exercises</Meta>
              <Meta className="text-2xs">{setCount} sets</Meta>
              <Meta className="text-2xs">{formatVolume(volume)}</Meta>
              {restLabel ? (
                <Meta className="text-2xs text-secondary">{restLabel}</Meta>
              ) : null}
            </View>

            <View className="flex-row gap-1.5 border-t border-surface-border px-2 py-1.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  restLabel
                    ? `Restart rest timer ${restLabel}`
                    : 'Start rest timer'
                }
                className="rounded-[10px] border border-surface-border px-2 py-1.5"
                onPress={() => startRestTimer(DEFAULT_REST_SECONDS)}
              >
                <Meta
                  className={`text-2xs ${restLabel ? 'text-secondary' : ''}`}
                >
                  {restLabel ? `Rest ${restLabel}` : 'Rest 1:30'}
                </Meta>
              </Pressable>

              {restLabel ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear rest timer"
                  className="rounded-[10px] border border-surface-border px-2 py-1.5"
                  onPress={clearRestTimer}
                >
                  <Meta className="text-2xs">Clear</Meta>
                </Pressable>
              ) : null}
            </View>
          </View>

          {activeSession.exercises.length > 0 ? (
            activeSession.exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.exerciseId}
                title={exercise.exerciseName}
                onDelete={() => removeExercise(exercise.exerciseId)}
              >
                <View className="flex-row items-center gap-2 px-1 pb-3 pt-1">
                  <Label className="w-8 text-center text-xs">Set</Label>
                  <Label className="flex-1 text-xs">Reps</Label>
                  <Label className="flex-1 text-xs">Weight</Label>
                  <Label className="w-[58px] text-center text-xs">Log</Label>
                  <Label className="w-11 text-center text-xs">Del</Label>
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
              className="h-10 w-10 items-center justify-center rounded-[12px] border border-surface-border bg-surface-card"
              onPress={() => setShowExerciseSheet(true)}
            >
              <Text className="font-mono text-xl text-foreground">+</Text>
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
  const [starting, setStarting] = useState(false);

  const hasCurrentWorkout = isWorkoutActive && currentWorkoutTitle !== null;
  const inactiveSubtitle = hasCurrentWorkout
    ? 'Your current workout is still in progress.'
    : nextRoutine
      ? `Your next workout is ready, ${nextRoutine.routineName}.`
      : 'Your next workout will appear here once a schedule is active.';

  useEffect(() => {
    refreshPreview();

    const unsubscribe = navigation.addListener('focus', () => {
      refreshPreview();
    });

    return unsubscribe;
  }, [navigation, refreshPreview]);

  const handleStartScheduled = (): void => {
    if (starting) {
      return;
    }

    setStarting(true);

    try {
      startWorkoutFromSchedule();
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
    } finally {
      setStarting(false);
    }
  };

  const handleContinueWorkout = (): void => {
    expandWorkout();
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
        <View
          className="mb-1 gap-2 border-surface-border pb-3"
          accessibilityRole="header"
        >
          <Heading className="text-4xl leading-[36px]">Workout</Heading>
          <Muted className="text-sm leading-[19px]">{inactiveSubtitle}</Muted>
        </View>

        {hasCurrentWorkout && currentWorkoutTitle ? (
          <Surface
            variant="card"
            className="w-full rounded-[18px] border border-surface-border p-4"
          >
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Label className="text-secondary">Current Workout</Label>
              <Meta>In progress</Meta>
            </View>
            <DisplayHeading className="text-3xl leading-[32px]">
              {currentWorkoutTitle}
            </DisplayHeading>
            <Muted className="mt-3 text-sm leading-[17px]">
              {currentExerciseCount} exercises in this session
            </Muted>
          </Surface>
        ) : nextRoutine ? (
          <Surface
            variant="card"
            className="w-full rounded-[18px] border border-surface-border p-4"
          >
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Label className="text-secondary">Next Workout</Label>
              <Meta>{nextRoutine.scheduleName}</Meta>
            </View>
            <DisplayHeading className="text-3xl leading-[32px]">
              {nextRoutine.routineName}
            </DisplayHeading>
            <Muted className="mt-3 text-sm leading-[17px]">
              {nextRoutine.exerciseCount} exercises • ~
              {nextRoutine.estimatedMinutes} mins
            </Muted>
          </Surface>
        ) : (
          <Surface
            variant="card"
            className="w-full rounded-[18px] border border-surface-border p-4"
          >
            <Heading className="text-2xl leading-[24px]">
              No active schedule
            </Heading>
            <Muted className="mt-2 text-sm leading-[17px]">
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
      </ScrollView>
    </Container>
  );
}

export function WorkoutActiveScreen(): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const {
    isWorkoutActive,
    isWorkoutCollapsed,
    startTime,
    restTimerEndsAt,
    startRestTimer,
    clearRestTimer,
  } = useWorkoutStore(
    useShallow((state) => ({
      isWorkoutActive: state.isWorkoutActive,
      isWorkoutCollapsed: state.isWorkoutCollapsed,
      startTime: state.startTime,
      restTimerEndsAt: state.restTimerEndsAt,
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
  } = useActiveWorkout();
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isWorkoutActive || isWorkoutCollapsed) {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorkoutActive, isWorkoutCollapsed]);

  useEffect(() => {
    if (restTimerEndsAt !== null && restTimerEndsAt <= now) {
      clearRestTimer();
    }
  }, [clearRestTimer, now, restTimerEndsAt]);

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

  return (
    <ActiveWorkoutContent
      activeSession={activeSession}
      sessionTitle={sessionTitle}
      durationLabel={durationLabel}
      exerciseCount={exerciseCount}
      setCount={setCount}
      volume={volume}
      restLabel={restLabel}
      onComplete={() => {
        completeWorkout();
      }}
      startRestTimer={startRestTimer}
      clearRestTimer={clearRestTimer}
      addSet={addSet}
      addExercise={addExercise}
      removeExercise={removeExercise}
      deleteSet={deleteSet}
      updateReps={updateReps}
      updateWeight={updateWeight}
      toggleSetLogged={toggleSetLogged}
      showExerciseSheet={showExerciseSheet}
      setShowExerciseSheet={setShowExerciseSheet}
      insets={insets}
    />
  );
}

export function WorkoutSheetHost(): React.JSX.Element {
  const { isWorkoutActive, isWorkoutCollapsed, collapseWorkout } =
    useWorkoutStore(
      useShallow((state) => ({
        isWorkoutActive: state.isWorkoutActive,
        isWorkoutCollapsed: state.isWorkoutCollapsed,
        collapseWorkout: state.collapseWorkout,
      })),
    );
  const sheetRef = React.useRef<TrueSheet>(null);
  const isPresentedRef = React.useRef(false);
  const isTransitioningRef = React.useRef(false);
  const latestIsWorkoutActiveRef = React.useRef(isWorkoutActive);
  const latestIsWorkoutCollapsedRef = React.useRef(isWorkoutCollapsed);

  useEffect(() => {
    latestIsWorkoutActiveRef.current = isWorkoutActive;
    latestIsWorkoutCollapsedRef.current = isWorkoutCollapsed;
  }, [isWorkoutActive, isWorkoutCollapsed]);

  useEffect(() => {
    const shouldPresent = isWorkoutActive && !isWorkoutCollapsed;

    if (shouldPresent) {
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
  }, [isWorkoutActive, isWorkoutCollapsed]);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[1]}
      cornerRadius={28}
      grabber
      backgroundBlur="light"
      onDidPresent={() => {
        isPresentedRef.current = true;
        isTransitioningRef.current = false;
      }}
      onDidDismiss={() => {
        isPresentedRef.current = false;
        isTransitioningRef.current = false;

        if (
          latestIsWorkoutActiveRef.current &&
          !latestIsWorkoutCollapsedRef.current
        ) {
          collapseWorkout();
        }
      }}
    >
      <WorkoutActiveScreen />
    </TrueSheet>
  );
}
