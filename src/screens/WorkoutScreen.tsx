import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { RootStackParamList } from '../navigation/types';
import { Routine, RoutineExercise, Exercise, WorkoutSet } from '../types';
import { getRoutineById } from '../database/routines';
import { useWorkout } from '../hooks/useWorkout';
import { useProgressiveOverload } from '../hooks/useProgressiveOverload';
import ExerciseCard from '../components/workout/ExerciseCard';
import RestTimer from '../components/workout/RestTimer';
import { v4 as uuidv4 } from 'uuid';
import { logSet, updateSet, deleteSet, getSetsByExercise } from '../database/workouts';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { updateActiveSet, completeActiveSet, clearActiveWorkout, startRestTimer, stopRestTimer } from '../store/workoutSlice';

type NavProp = StackNavigationProp<RootStackParamList>;
type WorkoutRouteProp = RouteProp<RootStackParamList, 'WorkoutMode'>;

function TimerDisplay({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <Text style={styles.timerText}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </Text>
  );
}

export default function WorkoutScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<WorkoutRouteProp>();
  const { routineId } = route.params || {};
  const dispatch = useDispatch<AppDispatch>();

  const { activeWorkout, startWorkout, finishWorkout, addSet, completeSet, skipRest } = useWorkout();
  const activeWorkoutState = useSelector((s: RootState) => s.workout.activeWorkout);

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(false);
  const [workoutStarted, setWorkoutStarted] = useState(false);

  useEffect(() => {
    if (routineId) {
      getRoutineById(routineId).then(setRoutine).catch(console.error);
    }
  }, [routineId]);

  const handleStartWorkout = async () => {
    setLoading(true);
    try {
      const name = routine?.name || `Workout ${format(new Date(), 'MMM d')}`;
      await startWorkout(name, routineId);
      setWorkoutStarted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    Alert.alert('Finish Workout', 'Are you sure you want to finish this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          await finishWorkout();
          navigation.goBack();
        },
      },
    ]);
  };

  const handleAddSet = async (exercise: RoutineExercise) => {
    if (!activeWorkoutState) return;
    const existingSets = activeWorkoutState.sets.filter(
      (s) => s.exerciseId === exercise.exerciseId && !s.isWarmup
    );
    // Get last set for prefill
    const lastSet = existingSets[existingSets.length - 1];
    const setData: Omit<WorkoutSet, 'id' | 'completedAt'> = {
      workoutId: activeWorkoutState.workout.id,
      exerciseId: exercise.exerciseId,
      setNumber: existingSets.length + 1,
      weight: lastSet?.weight ?? exercise.targetWeight ?? 0,
      reps: lastSet?.reps ?? undefined,
      weightUnit: 'kg',
      isWarmup: false,
      completed: false,
      notes: '',
    };
    const saved = await logSet(setData);
    dispatch(updateActiveSet({ id: saved.id, changes: saved }));
    // Manually add to store since logSetThunk would duplicate
    dispatch({ type: 'workout/logSet/fulfilled', payload: saved });
  };

  const handleCompleteSet = async (setId: string, reps: number, weight: number, restSecs: number) => {
    await updateSet(setId, { reps, weight, completed: true, completedAt: Date.now() });
    dispatch(completeActiveSet(setId));
    if (restSecs > 0) {
      dispatch(startRestTimer(restSecs));
    }
  };

  const handleRepsChange = (setId: string, reps: string) => {
    const n = parseInt(reps, 10);
    if (!isNaN(n) || reps === '') {
      dispatch(updateActiveSet({ id: setId, changes: { reps: reps === '' ? undefined : n } }));
    }
  };

  const handleWeightChange = (setId: string, weight: string) => {
    const n = parseFloat(weight);
    if (!isNaN(n) || weight === '') {
      dispatch(updateActiveSet({ id: setId, changes: { weight: weight === '' ? undefined : n } }));
    }
  };

  const handleRemoveSet = async (setId: string) => {
    await deleteSet(setId);
    // Filter from store
    if (activeWorkoutState) {
      const filtered = activeWorkoutState.sets.filter((s) => s.id !== setId);
      dispatch({ type: 'workout/setActiveWorkoutSets', payload: filtered });
    }
  };

  // Not yet started
  if (!activeWorkoutState || !workoutStarted) {
    return (
      <View style={styles.startContainer}>
        {routine ? (
          <>
            <Text variant="headlineMedium" style={styles.routineTitle}>{routine.name}</Text>
            {routine.description ? (
              <Text style={styles.routineDesc}>{routine.description}</Text>
            ) : null}
            <Text style={styles.exerciseCount}>
              {(routine.exercises || []).length} exercises
            </Text>
          </>
        ) : (
          <Text variant="headlineMedium" style={styles.routineTitle}>Free Workout</Text>
        )}
        <Button
          mode="contained"
          onPress={handleStartWorkout}
          loading={loading}
          disabled={loading}
          style={styles.startBtn}
          contentStyle={styles.startBtnContent}
          labelStyle={styles.startBtnLabel}
        >
          Start Workout
        </Button>
      </View>
    );
  }

  const exercises = routine?.exercises || [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <View>
          <Text style={styles.workoutName}>{activeWorkoutState.workout.name}</Text>
          <TimerDisplay seconds={activeWorkoutState.timerSeconds} />
        </View>
        <Button
          mode="contained-tonal"
          onPress={handleFinish}
          style={styles.finishBtn}
          labelStyle={styles.finishBtnLabel}
        >
          Finish
        </Button>
      </View>

      {/* Rest timer */}
      <RestTimer
        seconds={activeWorkoutState.restTimerSeconds}
        isRunning={activeWorkoutState.isRestTimerRunning}
        onStop={skipRest}
      />

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {exercises.length === 0 ? (
          <View style={styles.freeWorkout}>
            <Text style={styles.freeWorkoutText}>Free workout in progress...</Text>
            <Text style={styles.freeWorkoutSub}>Track your sets below</Text>
          </View>
        ) : (
          exercises.map((rex) => {
            const sets = activeWorkoutState.sets.filter(
              (s) => s.exerciseId === rex.exerciseId && s.notes !== '__deleted__'
            );
            if (!rex.exercise) return null;
            return (
              <ExerciseCard
                key={rex.id}
                exercise={rex.exercise}
                sets={sets}
                onAddSet={() => handleAddSet(rex)}
                onRepsChange={handleRepsChange}
                onWeightChange={handleWeightChange}
                onCompleteSet={(setId) => {
                  const s = sets.find((s) => s.id === setId);
                  handleCompleteSet(setId, s?.reps || 0, s?.weight || 0, rex.restSeconds);
                }}
                onRemoveSet={handleRemoveSet}
              />
            );
          })
        )}
        <View style={styles.bottomPad} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  startContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  routineTitle: { fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  routineDesc: { color: '#666', textAlign: 'center', marginBottom: 8 },
  exerciseCount: { color: '#888', marginBottom: 32 },
  startBtn: { width: '100%', borderRadius: 12 },
  startBtnContent: { height: 52 },
  startBtnLabel: { fontSize: 16, fontWeight: 'bold' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  workoutName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  timerText: { color: 'rgba(255,255,255,0.9)', fontSize: 22, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  finishBtn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  finishBtnLabel: { color: '#fff', fontWeight: 'bold' },
  scroll: { flex: 1, paddingTop: 12 },
  freeWorkout: { alignItems: 'center', paddingTop: 40 },
  freeWorkoutText: { fontSize: 18, fontWeight: 'bold', color: '#555' },
  freeWorkoutSub: { color: '#888', marginTop: 8 },
  bottomPad: { height: 80 },
});
