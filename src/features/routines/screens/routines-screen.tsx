import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useExercises } from '../hooks/use-exercises';
import { useRoutines } from '../hooks/use-routines';
import type { Exercise } from '@core/database/types';
import type { Routine } from '@core/database/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 10;

type Section = 'exercises' | 'routines';

// ─── Exercises section ─────────────────────────────────────────────────────────

function ExercisesSection(): React.JSX.Element {
  const { exercises, createExercise, deleteExercise } = useExercises();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [saving, setSaving] = useState(false);

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

  const renderExercise = ({ item }: { item: Exercise }): React.JSX.Element => (
    <View className="flex-row items-center justify-between bg-surface-elevated px-4 py-3 rounded-lg mb-2">
      <View className="flex-1">
        <Text className="text-white font-medium">{item.name}</Text>
        <Text className="text-white/50 text-xs mt-0.5">
          {item.muscle_group}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.name}`}
        onPress={() => deleteExercise(item.id)}
        hitSlop={8}
      >
        <Text className="text-red-400 text-sm">Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 px-4 pt-4">
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
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

function RoutinesSection(): React.JSX.Element {
  const { routines, createRoutine, deleteRoutine } = useRoutines();
  const { exercises } = useExercises();
  const [showForm, setShowForm] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleExercise = (id: string): void => {
    setSelectedExerciseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreate = (): void => {
    const trimmedName = routineName.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      createRoutine({
        name: trimmedName,
        exercises: selectedExerciseIds.map((exerciseId) => ({
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

  const renderRoutine = ({ item }: { item: Routine }): React.JSX.Element => (
    <View className="flex-row items-center justify-between bg-surface-elevated px-4 py-3 rounded-lg mb-2">
      <Text className="text-white font-medium flex-1">{item.name}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.name}`}
        onPress={() => deleteRoutine(item.id)}
        hitSlop={8}
      >
        <Text className="text-red-400 text-sm">Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 px-4 pt-4">
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
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
      {section === 'exercises' ? <ExercisesSection /> : <RoutinesSection />}
    </View>
  );
}
