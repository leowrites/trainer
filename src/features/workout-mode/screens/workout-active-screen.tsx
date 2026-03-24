/**
 * Active workout screen.
 *
 * CALLING SPEC:
 * - own navigation guards, header wiring, and modal navigation for the active workout
 * - subscribe only to active-workout visibility and header state
 * - keep timer coordination in a separate bridge so timer writes do not rerender the shell
 * - side effects: navigation updates and confirmation alerts
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@core/navigation';
import { useTheme } from '@core/theme/theme-context';
import { showExerciseTimerPicker } from '@shared/utils';
import { ActiveWorkoutContent } from '../components/active-workout-content';
import { WorkoutHeaderRight } from '../components/workout-header-right';
import { WorkoutHeaderTitle } from '../components/workout-header-title';
import { WorkoutTimerCoordinatorBridge } from '../components/workout-timer-coordinator-bridge';
import {
  useActiveWorkoutActions,
  useEnsureActiveWorkoutLoaded,
} from '../hooks/use-active-workout';
import {
  useActiveWorkoutHeaderState,
  useActiveWorkoutSessionMeta,
  useActiveWorkoutVisibility,
} from '../hooks/use-active-workout-state';
import {
  DEFAULT_EXERCISE_TIMER_SECONDS,
  selectExerciseName,
  useWorkoutStore,
} from '../store';
import { isExerciseDetailNavigationAction } from '../utils/formatters';

export type WorkoutActiveScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ActiveWorkout'
>;

export function WorkoutActiveScreen({
  navigation,
}: WorkoutActiveScreenProps): React.JSX.Element | null {
  const { colorMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { isWorkoutActive, isWorkoutCollapsed } = useActiveWorkoutVisibility();
  const sessionMeta = useActiveWorkoutSessionMeta();
  const { title, completedExerciseCount, totalExerciseCount, startTime } =
    useActiveWorkoutHeaderState();
  const {
    addExercise,
    removeExercise,
    addSet,
    deleteSet,
    updateExerciseRestSeconds,
    updateReps,
    updateWeight,
    updateActualRir,
    toggleSetLogged,
    flushPendingWrites,
    completeWorkout,
    deleteWorkout,
  } = useActiveWorkoutActions();
  const allowExitRef = useRef(false);
  const workoutVisibilityRef = useRef({
    isWorkoutActive,
    isWorkoutCollapsed,
  });

  useEnsureActiveWorkoutLoaded();

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

      useWorkoutStore.getState().collapseWorkout();
      event.preventDefault();
      navigation.dispatch(event.data.action);
    });

    return unsubscribe;
  }, [navigation]);

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
    }
  }, [isWorkoutActive, isWorkoutCollapsed, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerTitleAlign: 'left',
      headerShadowVisible: false,
      headerTransparent: true,
      headerTitle: () => (
        <WorkoutHeaderTitle
          title={title}
          completedExerciseCount={completedExerciseCount}
          totalExerciseCount={totalExerciseCount}
        />
      ),
      headerRight: () => <WorkoutHeaderRight startTime={startTime} />,
    });
  }, [
    completedExerciseCount,
    navigation,
    startTime,
    title,
    totalExerciseCount,
  ]);

  if (!isWorkoutActive || isWorkoutCollapsed || sessionMeta === null) {
    return null;
  }

  const showExerciseTimerOptions = (exerciseId: string): void => {
    const state = useWorkoutStore.getState();
    const durationSeconds =
      state.exerciseTimerDurationByExerciseId[exerciseId] ??
      DEFAULT_EXERCISE_TIMER_SECONDS;
    const exerciseName = selectExerciseName(state, exerciseId) ?? 'Exercise';

    showExerciseTimerPicker({
      title: `${exerciseName} timer`,
      message: 'Choose the timer duration for this exercise.',
      colorMode,
      currentDurationSeconds: durationSeconds,
      onSelectDuration: (nextDuration) => {
        const currentState = useWorkoutStore.getState();
        currentState.setExerciseTimerDuration(exerciseId, nextDuration);
        updateExerciseRestSeconds(exerciseId, nextDuration);
        currentState.startExerciseTimer(exerciseId, nextDuration);
      },
      onClear: () => {
        useWorkoutStore.getState().clearExerciseTimer(exerciseId);
      },
      clearActionLabel: 'Clear Timer',
      clearActionStyle: 'destructive',
    });
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
    <>
      <WorkoutTimerCoordinatorBridge
        enabled={isWorkoutActive && !isWorkoutCollapsed}
      />
      <ActiveWorkoutContent
        onCompleteWorkout={() => {
          flushPendingWrites();
          const completedSessionId = completeWorkout();

          if (completedSessionId) {
            allowExitRef.current = true;
            navigation.replace('WorkoutSummary', {
              sessionId: completedSessionId,
            });
          }
        }}
        onDeleteWorkout={handleDeleteWorkout}
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
        updateActualRir={updateActualRir}
        toggleSetLogged={toggleSetLogged}
        flushPendingWrites={flushPendingWrites}
        insets={insets}
      />
    </>
  );
}
