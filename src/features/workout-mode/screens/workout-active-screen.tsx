import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList } from '@core/navigation';
import { useTheme } from '@core/theme/theme-context';
import { useActiveWorkout } from '../hooks/use-active-workout';
import { usePreviousExercisePerformance } from '../hooks/use-previous-exercise-performance';
import { DEFAULT_EXERCISE_TIMER_SECONDS, useWorkoutStore } from '../store';
import { ActiveWorkoutContent } from '../components/active-workout-content';
import { WorkoutHeaderRight } from '../components/workout-header-right';
import { WorkoutHeaderTitle } from '../components/workout-header-title';
import {
  EXERCISE_TIMER_OPTIONS,
  countCompletedExercises,
  formatElapsedDuration,
  formatRestCountdown,
  isExerciseDetailNavigationAction,
} from '../utils/formatters';

export type WorkoutActiveScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ActiveWorkout'
>;

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
  const allowExitRef = useRef(false);
  const workoutVisibilityRef = useRef({
    isWorkoutActive,
    isWorkoutCollapsed,
  });
  const previousPerformanceByExerciseId = usePreviousExercisePerformance(
    activeSession?.id ?? null,
    activeSession?.exercises.map((exercise) => exercise.exerciseId) ?? [],
  );

  workoutVisibilityRef.current = {
    isWorkoutActive,
    isWorkoutCollapsed,
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      const workoutVisibility = workoutVisibilityRef.current;

      if (
        allowExitRef.current ||
        !workoutVisibility.isWorkoutActive ||
        workoutVisibility.isWorkoutCollapsed ||
        isExerciseDetailNavigationAction(event.data.action)
      ) {
        return;
      }

      event.preventDefault();
      collapseWorkout();
      navigation.dispatch(event.data.action);
    });

    return unsubscribe;
  }, [collapseWorkout, navigation]);

  useEffect(() => {
    if (allowExitRef.current) {
      return;
    }

    if (!isWorkoutActive || isWorkoutCollapsed) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Tabs', { screen: 'Workout' });
      }
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
              allowExitRef.current = true;
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Tabs', { screen: 'Workout' });
              }
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
        const completedSessionId = completeWorkout();

        if (completedSessionId) {
          allowExitRef.current = true;
          navigation.replace('WorkoutSummary', {
            sessionId: completedSessionId,
          });
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
