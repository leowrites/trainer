import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import type { Exercise, WorkoutSet } from '@core/database/types';

import { useWorkoutStore } from '../store';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import { useWorkoutSession } from '../hooks/use-workout-session';
import type {
  ExerciseGroup,
  UpdateSetInput,
} from '../hooks/use-workout-session';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── SetRow ──────────────────────────────────────────────────────────────────────

interface SetRowProps {
  index: number;
  set: WorkoutSet;
  onUpdate: (id: string, input: UpdateSetInput) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

function SetRow({
  index,
  set,
  onUpdate,
  onDelete,
  onToggleComplete,
}: SetRowProps): React.JSX.Element {
  const [localWeight, setLocalWeight] = useState<string>(String(set.weight));
  const [localReps, setLocalReps] = useState<string>(String(set.reps));

  // Sync local state when parent pushes updated values
  const prevSetRef = useRef(set);
  useEffect(() => {
    if (
      prevSetRef.current.weight !== set.weight ||
      prevSetRef.current.reps !== set.reps
    ) {
      setLocalWeight(String(set.weight));
      setLocalReps(String(set.reps));
      prevSetRef.current = set;
    }
  }, [set]);

  const commitUpdate = (): void => {
    const weight = parseFloat(localWeight) || 0;
    const reps = parseInt(localReps, 10) || 0;
    onUpdate(set.id, { weight, reps });
  };

  const isCompleted = set.is_completed === 1;

  return (
    <View
      className={`flex-row items-center gap-2 px-3 py-2 rounded-lg mb-1 ${
        isCompleted ? 'bg-primary-600/20' : 'bg-surface-elevated'
      }`}
    >
      {/* Set index */}
      <Text className="text-white/50 text-sm w-5 text-center">{index + 1}</Text>

      {/* Weight input */}
      <TextInput
        accessibilityLabel={`Set ${index + 1} weight`}
        className="flex-1 bg-surface text-white text-center rounded-md py-2 text-sm"
        keyboardType="decimal-pad"
        value={localWeight}
        onChangeText={setLocalWeight}
        onBlur={commitUpdate}
        selectTextOnFocus
      />

      {/* Reps input */}
      <TextInput
        accessibilityLabel={`Set ${index + 1} reps`}
        className="flex-1 bg-surface text-white text-center rounded-md py-2 text-sm"
        keyboardType="number-pad"
        value={localReps}
        onChangeText={setLocalReps}
        onBlur={commitUpdate}
        selectTextOnFocus
      />

      {/* Complete toggle */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isCompleted ? 'Mark set incomplete' : 'Mark set complete'
        }
        hitSlop={8}
        onPress={() => onToggleComplete(set.id)}
        className="w-8 h-8 rounded-full items-center justify-center bg-surface"
      >
        <Text
          className={`text-base font-bold ${
            isCompleted ? 'text-primary-400' : 'text-white/30'
          }`}
        >
          ✓
        </Text>
      </Pressable>

      {/* Delete */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete set ${index + 1}`}
        hitSlop={8}
        onPress={() => onDelete(set.id)}
      >
        <Text className="text-red-400 text-base px-1">✕</Text>
      </Pressable>
    </View>
  );
}

// ─── ExerciseSection ──────────────────────────────────────────────────────────

interface ExerciseSectionProps {
  group: ExerciseGroup;
  onUpdateSet: (id: string, input: UpdateSetInput) => void;
  onDeleteSet: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onAddSet: (exerciseId: string, weight: number, reps: number) => void;
}

function ExerciseSection({
  group,
  onUpdateSet,
  onDeleteSet,
  onToggleComplete,
  onAddSet,
}: ExerciseSectionProps): React.JSX.Element {
  const lastSet = group.sets.at(-1);
  const defaultWeight = lastSet ? lastSet.weight : 0;
  const defaultReps = lastSet ? lastSet.reps : 10;

  return (
    <View className="mb-5">
      <Text className="text-white font-semibold text-base mb-2">
        {group.exerciseName}
      </Text>

      {/* Column headers */}
      {group.sets.length > 0 && (
        <View className="flex-row items-center gap-2 px-3 mb-1">
          <Text className="text-white/40 text-xs w-5 text-center">SET</Text>
          <Text className="text-white/40 text-xs flex-1 text-center">KG</Text>
          <Text className="text-white/40 text-xs flex-1 text-center">REPS</Text>
          <View className="w-8" />
          <View className="w-6" />
        </View>
      )}

      {group.sets.map((set, i) => (
        <SetRow
          key={set.id}
          index={i}
          set={set}
          onUpdate={onUpdateSet}
          onDelete={onDeleteSet}
          onToggleComplete={onToggleComplete}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add set to ${group.exerciseName}`}
        className="mt-1 py-2 rounded-lg border border-white/10 items-center"
        onPress={() => onAddSet(group.exerciseId, defaultWeight, defaultReps)}
      >
        <Text className="text-white/60 text-sm">+ Add Set</Text>
      </Pressable>
    </View>
  );
}

// ─── ExercisePicker ───────────────────────────────────────────────────────────

interface ExercisePickerProps {
  exercises: Exercise[];
  onPick: (exerciseId: string) => void;
  onClose: () => void;
}

function ExercisePicker({
  exercises,
  onPick,
  onClose,
}: ExercisePickerProps): React.JSX.Element {
  return (
    <View className="mt-4 bg-surface-elevated rounded-xl p-3">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white font-semibold text-sm">Add Exercise</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close exercise picker"
          hitSlop={8}
          onPress={onClose}
        >
          <Text className="text-white/50 text-sm">✕</Text>
        </Pressable>
      </View>
      {exercises.length === 0 ? (
        <Text className="text-white/40 text-sm text-center py-2">
          No exercises found. Add some in the Routines tab.
        </Text>
      ) : (
        exercises.map((ex) => (
          <Pressable
            key={ex.id}
            accessibilityRole="button"
            accessibilityLabel={`Add ${ex.name}`}
            className="py-3 px-2 border-b border-white/10"
            onPress={() => onPick(ex.id)}
          >
            <Text className="text-white text-sm">{ex.name}</Text>
            <Text className="text-white/40 text-xs mt-0.5">
              {ex.muscle_group}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

// ─── ActiveWorkoutView ────────────────────────────────────────────────────────

interface ActiveWorkoutViewProps {
  sessionId: string;
}

function ActiveWorkoutView({
  sessionId,
}: ActiveWorkoutViewProps): React.JSX.Element {
  const {
    session,
    exerciseGroups,
    availableExercises,
    addSet,
    updateSet,
    deleteSet,
    toggleSetComplete,
    finishSession,
  } = useWorkoutSession(sessionId);

  const { startTime } = useWorkoutStore();
  const [elapsed, setElapsed] = useState<number>(0);
  const [showPicker, setShowPicker] = useState(false);

  // Tick the elapsed timer every second
  useEffect(() => {
    const origin = startTime ?? Date.now();
    setElapsed(Date.now() - origin);

    const id = setInterval(() => {
      setElapsed(Date.now() - origin);
    }, 1000);

    return () => clearInterval(id);
  }, [startTime]);

  const handleAddSet = useCallback(
    (exerciseId: string, weight: number, reps: number): void => {
      addSet({ exerciseId, weight, reps });
    },
    [addSet],
  );

  const handlePickExercise = useCallback(
    (exerciseId: string): void => {
      addSet({ exerciseId, weight: 0, reps: 10 });
      setShowPicker(false);
    },
    [addSet],
  );

  const sessionLabel = session?.snapshot_name ?? 'Free Workout';

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Session header */}
      <View className="mb-6">
        <Text className="text-white text-2xl font-bold">{sessionLabel}</Text>
        <Text className="text-white/50 text-sm mt-1">
          {formatElapsed(elapsed)}
        </Text>
      </View>

      {/* Exercise groups */}
      {exerciseGroups.length === 0 && (
        <Text className="text-white/40 text-sm text-center mb-6">
          No exercises yet — tap below to add one.
        </Text>
      )}

      {exerciseGroups.map((group) => (
        <ExerciseSection
          key={group.exerciseId}
          group={group}
          onUpdateSet={updateSet}
          onDeleteSet={deleteSet}
          onToggleComplete={toggleSetComplete}
          onAddSet={handleAddSet}
        />
      ))}

      {/* Add exercise */}
      {showPicker ? (
        <ExercisePicker
          exercises={availableExercises}
          onPick={handlePickExercise}
          onClose={() => setShowPicker(false)}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add exercise to workout"
          className="py-3 rounded-xl border border-white/15 items-center mb-6"
          onPress={() => setShowPicker(true)}
        >
          <Text className="text-white/60 text-sm font-semibold">
            + Add Exercise
          </Text>
        </Pressable>
      )}

      {/* Finish workout */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Finish workout"
        className="py-4 rounded-xl bg-primary-600 items-center"
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        onPress={finishSession}
      >
        <Text className="text-white text-base font-bold">Finish Workout</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── WorkoutScreen ─────────────────────────────────────────────────────────────

export function WorkoutScreen(): React.JSX.Element {
  const { isWorkoutActive, activeSessionId, endWorkout } = useWorkoutStore();
  const {
    nextRoutine,
    startWorkoutFromSchedule,
    startFreeWorkout,
    refreshPreview,
  } = useWorkoutStarter();
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshPreview();
    }, [refreshPreview]),
  );

  const handleStartScheduled = (): void => {
    if (starting) return;
    setStarting(true);
    try {
      startWorkoutFromSchedule();
    } finally {
      setStarting(false);
    }
  };

  const handleStartFree = (): void => {
    if (starting) return;
    setStarting(true);
    try {
      startFreeWorkout();
    } finally {
      setStarting(false);
    }
  };

  // ── Active session view ──────────────────────────────────────────────────────

  if (isWorkoutActive && activeSessionId) {
    return <ActiveWorkoutView sessionId={activeSessionId} />;
  }

  // Safety: isWorkoutActive without sessionId — reset and show idle screen
  if (isWorkoutActive && !activeSessionId) {
    endWorkout();
  }

  return (
    <View className="flex-1 items-center justify-center bg-surface px-6">
      <Text className="text-white text-2xl font-bold mb-2">Workout</Text>

      {nextRoutine ? (
        <View className="items-center mb-6">
          <Text className="text-white/60 text-xs mb-1 uppercase tracking-wider">
            Up next · {nextRoutine.scheduleName}
          </Text>
          <Text className="text-white text-lg font-semibold">
            {nextRoutine.routineName}
          </Text>
        </View>
      ) : (
        <Text className="text-white/60 text-sm mb-6">
          No active schedule — start a free workout
        </Text>
      )}

      {nextRoutine ? (
        <Pressable
          accessibilityRole="button"
          className="px-6 py-3 rounded-lg bg-primary-600 mb-3"
          style={({ pressed }) => ({
            opacity: pressed || starting ? 0.7 : 1,
          })}
          disabled={starting}
          onPress={handleStartScheduled}
        >
          <Text className="text-white text-base font-semibold">
            Start {nextRoutine.routineName}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        className="px-6 py-3 rounded-lg bg-surface-elevated"
        style={({ pressed }) => ({
          opacity: pressed || starting ? 0.7 : 1,
        })}
        disabled={starting}
        onPress={handleStartFree}
      >
        <Text className="text-white/60 text-base font-semibold">
          Free Workout
        </Text>
      </Pressable>
    </View>
  );
}
