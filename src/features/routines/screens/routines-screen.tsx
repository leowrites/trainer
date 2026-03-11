import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  Body,
  Button,
  Caption,
  Card,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Muted,
  Surface,
} from '@shared/components';
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
        <Card className="mb-2 rounded-xl">
          <Input
            className="mb-2"
            placeholder="Exercise name"
            value={editName}
            onChangeText={setEditName}
            autoCapitalize="words"
          />
          <Input
            className="mb-3"
            placeholder="Muscle group"
            value={editMuscleGroup}
            onChangeText={setEditMuscleGroup}
            autoCapitalize="words"
          />
          <View className="flex-row gap-2">
            <Button
              className="flex-1"
              onPress={() => handleSaveEdit(item.id)}
              loading={editSaving}
              disabled={editSaving}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onPress={() => setEditingId(null)}
            >
              Cancel
            </Button>
          </View>
        </Card>
      );
    }

    return (
      <Card className="mb-2 rounded-xl p-0">
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-1">
            <Body className="font-medium">{item.name}</Body>
            <Caption className="mt-0.5">{item.muscle_group}</Caption>
          </View>
          <View className="flex-row gap-2">
            <Button
              variant="ghost"
              size="sm"
              accessibilityLabel={`Edit ${item.name}`}
              onPress={() => handleStartEdit(item)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              accessibilityLabel={`Delete ${item.name}`}
              onPress={() => deleteExercise(item.id)}
            >
              Delete
            </Button>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 pt-2">
      <FlatList
        data={exercises}
        keyExtractor={(item: Exercise) => item.id}
        renderItem={renderExercise}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          <Muted className="text-center mt-8">
            No exercises yet. Add one below.
          </Muted>
        }
        ListFooterComponent={
          showForm ? (
            <Card label="New Exercise" className="mt-4 rounded-xl mx-0">
              <Input
                className="mb-2"
                placeholder="Exercise name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <Input
                className="mb-4"
                placeholder="Muscle group (e.g. Chest)"
                value={muscleGroup}
                onChangeText={setMuscleGroup}
                autoCapitalize="words"
              />
              <View className="flex-row gap-2">
                <Button
                  className="flex-1"
                  onPress={handleCreate}
                  loading={saving}
                  disabled={saving}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onPress={() => {
                    setShowForm(false);
                    setName('');
                    setMuscleGroup('');
                  }}
                >
                  Cancel
                </Button>
              </View>
            </Card>
          ) : (
            <Button
              variant="ghost"
              className="mt-4 mx-4"
              onPress={() => setShowForm(true)}
            >
              + New Exercise
            </Button>
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

  // Re-fetch exercises for the currently expanded routine whenever that
  // specific routine's data changes (e.g. after an updateRoutine call).
  // We narrow the dependency to the expanded routine's identity so we
  // don't trigger a redundant query when unrelated routines change.
  const expandedRoutine = routines.find((r) => r.id === expandedId) ?? null;
  useEffect(() => {
    if (expandedId !== null) {
      setExpandedExercises(getRoutineExercises(expandedId));
    }
  }, [expandedRoutine, expandedId, getRoutineExercises]);

  const renderRoutine = ({ item }: { item: Routine }): React.JSX.Element => {
    if (editingId === item.id) {
      return (
        <Card className="mb-2 rounded-xl">
          <Input
            className="mb-4"
            placeholder="Routine name"
            value={editName}
            onChangeText={setEditName}
            autoCapitalize="words"
          />
          <Label className="mb-2">Select Exercises</Label>
          {exercises.length === 0 ? (
            <Muted className="mb-4">No exercises available.</Muted>
          ) : (
            exercises.map((ex) => (
              <Checkbox
                key={ex.id}
                checked={editSelectedIds.includes(ex.id)}
                onToggle={() => toggleEditExercise(ex.id)}
                label={ex.name}
                sublabel={ex.muscle_group}
              />
            ))
          )}
          <View className="flex-row gap-2 mt-4">
            <Button
              className="flex-1"
              onPress={() => handleSaveEdit(item.id)}
              loading={editSaving}
              disabled={editSaving}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onPress={() => setEditingId(null)}
            >
              Cancel
            </Button>
          </View>
        </Card>
      );
    }

    const isExpanded = expandedId === item.id;

    return (
      <Card
        className="mb-2 rounded-xl p-0 overflow-hidden"
        onPress={() => handleToggleExpand(item)}
        accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <Body className="font-medium flex-1">{item.name}</Body>
          <View className="flex-row gap-2 items-center">
            <Button
              variant="ghost"
              size="sm"
              accessibilityLabel={`Edit ${item.name}`}
              onPress={() => handleStartEdit(item)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              accessibilityLabel={`Delete ${item.name}`}
              onPress={() => deleteRoutine(item.id)}
            >
              Delete
            </Button>
            <Caption>{isExpanded ? '▲' : '▼'}</Caption>
          </View>
        </View>

        {isExpanded && (
          <Surface variant="elevated" className="px-4 pb-3 pt-2">
            {expandedExercises.length === 0 ? (
              <Muted className="pt-1">No exercises in this routine.</Muted>
            ) : (
              expandedExercises.map((re: RoutineExercise) => {
                const ex = exercises.find(
                  (e: Exercise) => e.id === re.exercise_id,
                );
                return (
                  <Body key={re.id} className="pt-2">
                    {ex ? ex.name : re.exercise_id} — {re.target_sets} ×{' '}
                    {re.target_reps}
                  </Body>
                );
              })
            )}
          </Surface>
        )}
      </Card>
    );
  };

  return (
    <View className="flex-1 pt-2">
      <FlatList
        data={routines}
        keyExtractor={(item: Routine) => item.id}
        renderItem={renderRoutine}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          <Muted className="text-center mt-8">
            No routines yet. Create one below.
          </Muted>
        }
        ListFooterComponent={
          showForm ? (
            <Card label="New Routine" className="mt-4 rounded-xl mx-0">
              <Input
                className="mb-4"
                placeholder="Routine name (e.g. Push A)"
                value={routineName}
                onChangeText={setRoutineName}
                autoCapitalize="words"
              />
              <Label className="mb-2">Select Exercises</Label>
              {exercises.length === 0 ? (
                <Muted className="mb-4">
                  No exercises available — create some in the Exercises section.
                </Muted>
              ) : (
                exercises.map((ex) => (
                  <Checkbox
                    key={ex.id}
                    checked={selectedExerciseIds.includes(ex.id)}
                    onToggle={() => toggleExercise(ex.id)}
                    label={ex.name}
                    sublabel={ex.muscle_group}
                  />
                ))
              )}
              <View className="flex-row gap-2 mt-4">
                <Button
                  className="flex-1"
                  onPress={handleCreate}
                  loading={saving}
                  disabled={saving}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onPress={() => {
                    setShowForm(false);
                    setRoutineName('');
                    setSelectedExerciseIds([]);
                  }}
                >
                  Cancel
                </Button>
              </View>
            </Card>
          ) : (
            <Button
              variant="ghost"
              className="mt-4 mx-4"
              onPress={() => setShowForm(true)}
            >
              + New Routine
            </Button>
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
    <Container className="pt-14 px-0">
      {/* Header */}
      <View className="px-4 pb-4">
        <Heading>Routines</Heading>
      </View>

      {/* Section tabs */}
      <Surface variant="elevated" className="flex-row mx-4 mb-2 rounded-lg p-1">
        {(['exercises', 'routines'] as const).map((s) => (
          <Button
            key={s}
            variant={section === s ? 'primary' : 'ghost'}
            size="sm"
            className="flex-1 capitalize"
            accessibilityLabel={s}
            onPress={() => setSection(s)}
          >
            {s}
          </Button>
        ))}
      </Surface>

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
    </Container>
  );
}
