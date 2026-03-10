import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { useExercises } from '../hooks/use-exercises';
import { useRoutines } from '../hooks/use-routines';
import type { NewExerciseInput } from '../hooks/use-exercises';
import type {
  NewRoutineInput,
  RoutineExerciseInput,
} from '../hooks/use-routines';
import type { Exercise, Routine, RoutineExercise } from '@core/database/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 10;

type Section = 'exercises' | 'routines';

// ─── Exercises section ─────────────────────────────────────────────────────────

interface ExercisesSectionProps {
  exercises: Exercise[];
  createExercise: (input: NewExerciseInput) => void;
  updateExercise: (id: string, input: NewExerciseInput) => void;
  deleteExercise: (id: string) => void;
}

function ExercisesSection({
  exercises,
  createExercise,
  updateExercise,
  deleteExercise,
}: ExercisesSectionProps): React.JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMuscleGroup, setEditMuscleGroup] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const handleCreate = (): void => {
    const trimmedName = name.trim();
    const trimmedGroup = muscleGroup.trim();
    if (!trimmedName || !trimmedGroup) return;
    setSaving(true);
    try {
      createExercise({ name: trimmedName, muscleGroup: trimmedGroup });
      setName('');
      setMuscleGroup('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (item: Exercise): void => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditMuscleGroup(item.muscle_group);
  };

  const handleSaveEdit = (id: string): void => {
    const trimmedName = editName.trim();
    const trimmedGroup = editMuscleGroup.trim();
    if (!trimmedName || !trimmedGroup) return;
    setEditSaving(true);
    try {
      updateExercise(id, { name: trimmedName, muscleGroup: trimmedGroup });
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  };

  const renderExercise = ({ item }: { item: Exercise }): React.JSX.Element => {
    if (editingId === item.id) {
      return (
        <View className="bg-surface-elevated px-4 py-3 rounded-lg mb-2">
          <TextInput
            className="bg-surface text-white rounded-md px-3 py-2 mb-2"
            placeholder="Exercise name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={editName}
            onChangeText={setEditName}
            autoCapitalize="words"
          />
          <TextInput
            className="bg-surface text-white rounded-md px-3 py-2 mb-3"
            placeholder="Muscle group"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={editMuscleGroup}
            onChangeText={setEditMuscleGroup}
            autoCapitalize="words"
          />
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              className="flex-1 bg-primary-600 rounded-md py-2 items-center"
              onPress={() => handleSaveEdit(item.id)}
              disabled={editSaving}
            >
              {editSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Save</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="flex-1 bg-surface rounded-md py-2 items-center"
              onPress={() => setEditingId(null)}
            >
              <Text className="text-white/60 font-semibold">Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View className="flex-row items-center justify-between bg-surface-elevated px-4 py-3 rounded-lg mb-2">
        <View className="flex-1">
          <Text className="text-white font-medium">{item.name}</Text>
          <Text className="text-white/50 text-xs mt-0.5">
            {item.muscle_group}
          </Text>
        </View>
        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.name}`}
            onPress={() => handleStartEdit(item)}
            hitSlop={8}
          >
            <Text className="text-primary-400 text-sm">Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
            onPress={() => deleteExercise(item.id)}
            hitSlop={8}
          >
            <Text className="text-red-400 text-sm">Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 px-4 pt-4">
      <FlatList
        data={exercises}
        keyExtractor={(item: Exercise) => item.id}
        renderItem={renderExercise}
        ListEmptyComponent={
          <Text className="text-white/40 text-center mt-8">
            No exercises yet. Add one below.
          </Text>
        }
        ListFooterComponent={
          showForm ? (
            <View className="mt-4 bg-surface-elevated rounded-lg p-4">
              <Text className="text-white font-semibold mb-3">
                New Exercise
              </Text>
              <TextInput
                className="bg-surface text-white rounded-md px-3 py-2 mb-2"
                placeholder="Exercise name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                className="bg-surface text-white rounded-md px-3 py-2 mb-4"
                placeholder="Muscle group (e.g. Chest)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={muscleGroup}
                onChangeText={setMuscleGroup}
                autoCapitalize="words"
              />
              <View className="flex-row gap-2">
                <Pressable
                  accessibilityRole="button"
                  className="flex-1 bg-primary-600 rounded-md py-2 items-center"
                  onPress={handleCreate}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold">Save</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="flex-1 bg-surface rounded-md py-2 items-center"
                  onPress={() => {
                    setShowForm(false);
                    setName('');
                    setMuscleGroup('');
                  }}
                >
                  <Text className="text-white/60 font-semibold">Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              className="mt-4 bg-surface-elevated rounded-lg py-3 items-center"
              onPress={() => setShowForm(true)}
            >
              <Text className="text-primary-400 font-semibold">
                + New Exercise
              </Text>
            </Pressable>
          )
        }
      />
    </View>
  );
}

// ─── Routines section ──────────────────────────────────────────────────────────

interface RoutinesSectionProps {
  routines: Routine[];
  exercises: Exercise[];
  createRoutine: (input: NewRoutineInput) => Routine;
  updateRoutine: (id: string, input: NewRoutineInput) => void;
  deleteRoutine: (id: string) => void;
  getRoutineExercises: (routineId: string) => RoutineExercise[];
}

function RoutinesSection({
  routines,
  exercises,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  getRoutineExercises,
}: RoutinesSectionProps): React.JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // expandedId: which routine row is showing its exercises
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // expandedExercises: cached exercises for the expanded routine
  const [expandedExercises, setExpandedExercises] = useState<RoutineExercise[]>(
    [],
  );

  // editingId: which routine row is in edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSelectedIds, setEditSelectedIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const toggleExercise = (id: string): void => {
    setSelectedExerciseIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id],
    );
  };

  const toggleEditExercise = (id: string): void => {
    setEditSelectedIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id],
    );
  };

  const handleCreate = (): void => {
    const trimmedName = routineName.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      createRoutine({
        name: trimmedName,
        exercises: selectedExerciseIds.map((exerciseId: string) => ({
          exerciseId,
          targetSets: DEFAULT_TARGET_SETS,
          targetReps: DEFAULT_TARGET_REPS,
        })),
      });
      setRoutineName('');
      setSelectedExerciseIds([]);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (item: Routine): void => {
    const currentExercises = getRoutineExercises(item.id);
    setEditingId(item.id);
    setEditName(item.name);
    setEditSelectedIds(
      currentExercises.map((re: RoutineExercise) => re.exercise_id),
    );
    // close expand when entering edit mode
    setExpandedId(null);
    setExpandedExercises([]);
  };

  const handleSaveEdit = (id: string): void => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    setEditSaving(true);
    try {
      const exerciseInputs: RoutineExerciseInput[] = editSelectedIds.map(
        (exerciseId: string) => ({
          exerciseId,
          targetSets: DEFAULT_TARGET_SETS,
          targetReps: DEFAULT_TARGET_REPS,
        }),
      );
      updateRoutine(id, { name: trimmedName, exercises: exerciseInputs });
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleExpand = (item: Routine): void => {
    if (expandedId === item.id) {
      setExpandedId(null);
      setExpandedExercises([]);
    } else {
      setExpandedId(item.id);
      setExpandedExercises(getRoutineExercises(item.id));
      // close edit when expanding
      setEditingId(null);
    }
  };

  const renderRoutine = ({ item }: { item: Routine }): React.JSX.Element => {
    if (editingId === item.id) {
      return (
        <View className="bg-surface-elevated px-4 py-3 rounded-lg mb-2">
          <TextInput
            className="bg-surface text-white rounded-md px-3 py-2 mb-4"
            placeholder="Routine name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={editName}
            onChangeText={setEditName}
            autoCapitalize="words"
          />
          <Text className="text-white/60 text-xs uppercase tracking-wider mb-2">
            Select Exercises
          </Text>
          {exercises.length === 0 ? (
            <Text className="text-white/40 text-sm mb-4">
              No exercises available.
            </Text>
          ) : (
            exercises.map((ex) => (
              <Pressable
                key={ex.id}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: editSelectedIds.includes(ex.id),
                }}
                className="flex-row items-center py-2"
                onPress={() => toggleEditExercise(ex.id)}
              >
                <View
                  className={`w-5 h-5 rounded mr-3 border ${
                    editSelectedIds.includes(ex.id)
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-white/30'
                  }`}
                />
                <Text className="text-white">{ex.name}</Text>
                <Text className="text-white/40 text-xs ml-2">
                  {ex.muscle_group}
                </Text>
              </Pressable>
            ))
          )}
          <View className="flex-row gap-2 mt-4">
            <Pressable
              accessibilityRole="button"
              className="flex-1 bg-primary-600 rounded-md py-2 items-center"
              onPress={() => handleSaveEdit(item.id)}
              disabled={editSaving}
            >
              {editSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Save</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="flex-1 bg-surface rounded-md py-2 items-center"
              onPress={() => setEditingId(null)}
            >
              <Text className="text-white/60 font-semibold">Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    const isExpanded = expandedId === item.id;

    return (
      <View className="bg-surface-elevated rounded-lg mb-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
          className="flex-row items-center justify-between px-4 py-3"
          onPress={() => handleToggleExpand(item)}
        >
          <Text className="text-white font-medium flex-1">{item.name}</Text>
          <View className="flex-row gap-3 items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
              onPress={() => handleStartEdit(item)}
              hitSlop={8}
            >
              <Text className="text-primary-400 text-sm">Edit</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
              onPress={() => deleteRoutine(item.id)}
              hitSlop={8}
            >
              <Text className="text-red-400 text-sm">Delete</Text>
            </Pressable>
            <Text className="text-white/40 text-xs">
              {isExpanded ? '▲' : '▼'}
            </Text>
          </View>
        </Pressable>

        {isExpanded && (
          <View className="px-4 pb-3 border-t border-white/10">
            {expandedExercises.length === 0 ? (
              <Text className="text-white/40 text-sm pt-2">
                No exercises in this routine.
              </Text>
            ) : (
              expandedExercises.map((re: RoutineExercise) => {
                const ex = exercises.find(
                  (e: Exercise) => e.id === re.exercise_id,
                );
                return (
                  <Text key={re.id} className="text-white/70 text-sm pt-2">
                    {ex ? ex.name : re.exercise_id} — {re.target_sets} ×{' '}
                    {re.target_reps}
                  </Text>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 px-4 pt-4">
      <FlatList
        data={routines}
        keyExtractor={(item: Routine) => item.id}
        renderItem={renderRoutine}
        ListEmptyComponent={
          <Text className="text-white/40 text-center mt-8">
            No routines yet. Create one below.
          </Text>
        }
        ListFooterComponent={
          showForm ? (
            <View className="mt-4 bg-surface-elevated rounded-lg p-4">
              <Text className="text-white font-semibold mb-3">New Routine</Text>
              <TextInput
                className="bg-surface text-white rounded-md px-3 py-2 mb-4"
                placeholder="Routine name (e.g. Push A)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={routineName}
                onChangeText={setRoutineName}
                autoCapitalize="words"
              />
              <Text className="text-white/60 text-xs uppercase tracking-wider mb-2">
                Select Exercises
              </Text>
              {exercises.length === 0 ? (
                <Text className="text-white/40 text-sm mb-4">
                  No exercises available — create some in the Exercises section.
                </Text>
              ) : (
                exercises.map((ex) => (
                  <Pressable
                    key={ex.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: selectedExerciseIds.includes(ex.id),
                    }}
                    className="flex-row items-center py-2"
                    onPress={() => toggleExercise(ex.id)}
                  >
                    <View
                      className={`w-5 h-5 rounded mr-3 border ${
                        selectedExerciseIds.includes(ex.id)
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-white/30'
                      }`}
                    />
                    <Text className="text-white">{ex.name}</Text>
                    <Text className="text-white/40 text-xs ml-2">
                      {ex.muscle_group}
                    </Text>
                  </Pressable>
                ))
              )}
              <View className="flex-row gap-2 mt-4">
                <Pressable
                  accessibilityRole="button"
                  className="flex-1 bg-primary-600 rounded-md py-2 items-center"
                  onPress={handleCreate}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold">Save</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="flex-1 bg-surface rounded-md py-2 items-center"
                  onPress={() => {
                    setShowForm(false);
                    setRoutineName('');
                    setSelectedExerciseIds([]);
                  }}
                >
                  <Text className="text-white/60 font-semibold">Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              className="mt-4 bg-surface-elevated rounded-lg py-3 items-center"
              onPress={() => setShowForm(true)}
            >
              <Text className="text-primary-400 font-semibold">
                + New Routine
              </Text>
            </Pressable>
          )
        }
      />
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export function RoutinesScreen(): React.JSX.Element {
  const [section, setSection] = useState<Section>('exercises');

  const {
    exercises,
    refresh: refreshExercises,
    createExercise,
    updateExercise,
    deleteExercise,
  } = useExercises();

  const {
    routines,
    refresh: refreshRoutines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    getRoutineExercises,
  } = useRoutines();

  useFocusEffect(
    useCallback(() => {
      refreshExercises();
      refreshRoutines();
    }, [refreshExercises, refreshRoutines]),
  );

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="pt-14 pb-4 px-4">
        <Text className="text-white text-2xl font-bold">Routines</Text>
      </View>

      {/* Section tabs */}
      <View className="flex-row mx-4 mb-2 bg-surface-elevated rounded-lg p-1">
        {(['exercises', 'routines'] as const).map((s) => (
          <Pressable
            key={s}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === s }}
            className={`flex-1 py-2 rounded-md items-center ${
              section === s ? 'bg-primary-600' : ''
            }`}
            onPress={() => setSection(s)}
          >
            <Text
              className={`text-sm font-semibold capitalize ${
                section === s ? 'text-white' : 'text-white/50'
              }`}
            >
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Active section */}
      {section === 'exercises' ? (
        <ExercisesSection
          exercises={exercises}
          createExercise={createExercise}
          updateExercise={updateExercise}
          deleteExercise={deleteExercise}
        />
      ) : (
        <RoutinesSection
          routines={routines}
          exercises={exercises}
          createRoutine={createRoutine}
          updateRoutine={updateRoutine}
          deleteRoutine={deleteRoutine}
          getRoutineExercises={getRoutineExercises}
        />
      )}
    </View>
  );
}
