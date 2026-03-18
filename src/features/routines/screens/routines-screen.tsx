import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  ActionRow,
  Body,
  Button,
  Caption,
  Card,
  Checkbox,
  Container,
  DisclosureCard,
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

function SectionSwitcher({
  section,
  onChange,
}: {
  section: Section;
  onChange: (section: Section) => void;
}): React.JSX.Element {
  return (
    <View className="mx-0 flex-row overflow-hidden rounded-[18px] border-y border-surface-border bg-surface-card">
      {(['exercises', 'routines'] as const).map((item, index) => {
        const active = section === item;
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={item}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item)}
            className={`flex-1 px-3 py-3 ${
              index === 0 ? 'border-r border-surface-border' : ''
            }`}
          >
            <View className="flex-row items-center justify-center">
              <Label className={active ? 'text-foreground' : 'text-muted'}>
                {item}
              </Label>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function FormSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card className="mx-0 rounded-[20px] px-4 py-4">
      <View className="mb-2 flex-row items-center gap-3">
        <Label className="text-secondary">{label}</Label>
        <View className="h-px flex-1 bg-surface-border" />
      </View>
      {children}
    </Card>
  );
}

function NewItemButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      className="mx-0 rounded-[16px] border border-surface-border bg-surface-card px-4 py-3"
      onPress={onPress}
    >
      <Label className="text-secondary">{label}</Label>
    </Pressable>
  );
}

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
        <Card className="mx-0 mb-3 rounded-[20px] px-4 py-4">
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
          <ActionRow
            className="mt-0"
            onPrimaryPress={() => handleSaveEdit(item.id)}
            primaryLoading={editSaving}
            onSecondaryPress={() => setEditingId(null)}
          />
        </Card>
      );
    }

    return (
      <Card className="mx-0 mb-3 rounded-[20px] px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Body className="font-heading text-[22px] leading-[24px]">
              {item.name}
            </Body>
            <Caption className="mt-1 uppercase tracking-[1.5px]">
              {item.muscle_group}
            </Caption>
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
    <View className="flex-1">
      <FlatList
        data={exercises}
        keyExtractor={(item: Exercise) => item.id}
        renderItem={renderExercise}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 0,
          paddingBottom: 12,
        }}
        ListEmptyComponent={
          <Muted className="px-0 py-4 text-center">
            No exercises yet. Add one below.
          </Muted>
        }
        ListFooterComponent={
          showForm ? (
            <FormSection label="New Exercise">
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
              <ActionRow
                className="mt-0"
                onPrimaryPress={handleCreate}
                primaryLoading={saving}
                onSecondaryPress={() => {
                  setShowForm(false);
                  setName('');
                  setMuscleGroup('');
                }}
              />
            </FormSection>
          ) : (
            <NewItemButton
              label="+ New Exercise"
              onPress={() => setShowForm(true)}
            />
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

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<RoutineExercise[]>(
    [],
  );

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
      setEditingId(null);
    }
  };

  const expandedRoutine = routines.find((r) => r.id === expandedId) ?? null;
  useEffect(() => {
    if (expandedId !== null) {
      setExpandedExercises(getRoutineExercises(expandedId));
    }
  }, [expandedRoutine, expandedId, getRoutineExercises]);

  const renderRoutine = ({ item }: { item: Routine }): React.JSX.Element => {
    if (editingId === item.id) {
      return (
        <Card className="mx-0 mb-3 rounded-[20px] px-4 py-4">
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
          <ActionRow
            className="mt-3"
            onPrimaryPress={() => handleSaveEdit(item.id)}
            primaryLoading={editSaving}
            onSecondaryPress={() => setEditingId(null)}
          />
        </Card>
      );
    }

    const isExpanded = expandedId === item.id;

    return (
      <DisclosureCard
        title={item.name}
        expanded={isExpanded}
        onToggle={() => handleToggleExpand(item)}
        className="mx-0 rounded-[20px] border border-surface-border"
        headerClassName="px-4 py-4"
        contentClassName="px-4 pb-4"
        accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
        actions={
          <>
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
          </>
        }
      >
        {expandedExercises.length === 0 ? (
          <Muted className="pt-1">No exercises in this routine.</Muted>
        ) : (
          <View className="pt-1">
            {expandedExercises.map((re: RoutineExercise, index: number) => {
              const ex = exercises.find(
                (e: Exercise) => e.id === re.exercise_id,
              );
              const last = index === expandedExercises.length - 1;
              return (
                <View
                  key={re.id}
                  className={`flex-row items-start justify-between py-2 ${
                    last ? '' : 'border-b border-surface-border'
                  }`}
                >
                  <Body className="flex-1 font-heading text-[18px] leading-[22px]">
                    {ex ? ex.name : re.exercise_id}
                  </Body>
                  <Caption className="ml-3 text-right">
                    {re.target_sets} × {re.target_reps}
                  </Caption>
                </View>
              );
            })}
          </View>
        )}
      </DisclosureCard>
    );
  };

  return (
    <View className="flex-1">
      <FlatList
        data={routines}
        keyExtractor={(item: Routine) => item.id}
        renderItem={renderRoutine}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 0,
          paddingBottom: 12,
        }}
        ListEmptyComponent={
          <Muted className="px-0 py-4 text-center">
            No routines yet. Create one below.
          </Muted>
        }
        ListFooterComponent={
          showForm ? (
            <FormSection label="New Routine">
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
              <ActionRow
                className="mt-3"
                onPrimaryPress={handleCreate}
                primaryLoading={saving}
                onSecondaryPress={() => {
                  setShowForm(false);
                  setRoutineName('');
                  setSelectedExerciseIds([]);
                }}
              />
            </FormSection>
          ) : (
            <NewItemButton
              label="+ New Routine"
              onPress={() => setShowForm(true)}
            />
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
    <Container>
      <View className="border-surface-border px-0 pb-3">
        <View accessibilityRole="header" className="gap-2">
          <Heading className="text-[34px] leading-[36px]">Routines</Heading>
          <Muted className="text-[14px] leading-[19px]">
            Build your exercise library and shape reliable templates for the
            sessions you repeat most.
          </Muted>
        </View>
      </View>

      <View className="py-3">
        <Surface variant="card" className="mx-0 rounded-[20px] px-4 py-4">
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <Label className="text-secondary">
              {section === 'exercises' ? 'Exercise Library' : 'Routine Library'}
            </Label>
            <Caption className="text-foreground">
              {section === 'exercises'
                ? `${exercises.length} saved`
                : `${routines.length} saved`}
            </Caption>
          </View>
          <Heading className="text-[22px] leading-[24px]">
            {section === 'exercises' ? 'Exercises' : 'Routines'}
          </Heading>
          <Muted className="mt-2 text-[12px] leading-[17px]">
            {section === 'exercises'
              ? 'Keep names and muscle groups clean so adding exercises in a session stays quick.'
              : 'Group exercises into dependable templates you can schedule and run without extra setup.'}
          </Muted>
        </Surface>
      </View>

      <SectionSwitcher section={section} onChange={setSection} />

      <View className="flex-1 pt-3">
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
    </Container>
  );
}
