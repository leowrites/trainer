import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  Body,
  Button,
  Card,
  Container,
  Heading,
  Input,
  Label,
  Muted,
} from '@shared/components';
import { useExercises } from '../hooks/use-exercises';
import { useRoutineInsights } from '../hooks/use-routine-insights';
import { useRoutines } from '../hooks/use-routines';
import type { NewExerciseInput } from '../hooks/use-exercises';
import type {
  NewRoutineInput,
  RoutineExerciseInput,
} from '../hooks/use-routines';
import type { Exercise, Routine, RoutineExercise } from '@core/database/types';

const DEFAULT_TARGET_SETS = '3';
const DEFAULT_TARGET_REPS = '10';

type Section = 'exercises' | 'routines';

type ScreenState =
  | { kind: 'library' }
  | { kind: 'exercise'; exerciseId: string | null }
  | { kind: 'routine'; routineId: string | null };

interface RoutineExerciseDraft {
  exerciseId: string;
  targetSets: string;
  targetReps: string;
}

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDateLabel(timestamp: number | null): string {
  if (timestamp === null) {
    return 'Not yet';
  }

  return shortDateFormatter.format(timestamp);
}

function formatDurationLabel(durationMinutes: number | null): string {
  if (durationMinutes === null) {
    return 'No completed sessions yet';
  }

  return `${Math.round(durationMinutes)} min avg`;
}

function formatVolumeLabel(value: number | null): string {
  if (value === null) {
    return 'No volume yet';
  }

  return `${Math.round(value)} avg volume`;
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function parsePositiveWholeNumber(value: string, fallback: number): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildRoutineExerciseDrafts(
  routineExercises: RoutineExercise[],
): RoutineExerciseDraft[] {
  return routineExercises.map((entry) => ({
    exerciseId: entry.exercise_id,
    targetSets: String(entry.target_sets),
    targetReps: String(entry.target_reps),
  }));
}

function SectionSwitcher({
  section,
  exercisesCount,
  routinesCount,
  onChange,
}: {
  section: Section;
  exercisesCount: number;
  routinesCount: number;
  onChange: (section: Section) => void;
}): React.JSX.Element {
  return (
    <View className="mt-4 rounded-[24px] border border-surface-border/80 bg-surface-card p-1">
      <View className="flex-row">
        {(
          [
            ['exercises', exercisesCount],
            ['routines', routinesCount],
          ] as const
        ).map(([item, count]) => {
          const active = section === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={item}
              accessibilityState={{ selected: active }}
              className={`flex-1 rounded-[18px] px-4 py-3 ${
                active ? 'bg-surface-elevated' : ''
              }`}
              onPress={() => onChange(item)}
            >
              <Label className={active ? 'text-foreground' : 'text-muted'}>
                {item}
              </Label>
              <Muted className="mt-1 text-xs">{count} total</Muted>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function LibraryHeader({
  section,
  exercisesCount,
  routinesCount,
  searchQuery,
  onSearchChange,
  onChangeSection,
  onCreate,
}: {
  section: Section;
  exercisesCount: number;
  routinesCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onChangeSection: (section: Section) => void;
  onCreate: () => void;
}): React.JSX.Element {
  const actionLabel = section === 'exercises' ? 'New Exercise' : 'New Routine';

  return (
    <View className="pb-5">
      <View accessibilityRole="header" className="gap-2">
        <Heading className="text-4xl leading-[36px]">Routines</Heading>
        <Muted className="max-w-[300px] text-sm leading-[19px]">
          Search your library, jump into dedicated detail pages, and keep your
          templates organized before the next workout starts.
        </Muted>
      </View>

      <SectionSwitcher
        section={section}
        exercisesCount={exercisesCount}
        routinesCount={routinesCount}
        onChange={onChangeSection}
      />

      <Input
        className="mt-4"
        placeholder={
          section === 'exercises' ? 'Search exercises' : 'Search routines'
        }
        value={searchQuery}
        onChangeText={onSearchChange}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button className="mt-4 w-full" onPress={onCreate}>
        {actionLabel}
      </Button>
    </View>
  );
}

function PageHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}): React.JSX.Element {
  return (
    <View className="pb-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to routines"
        className="mb-4 self-start rounded-[16px] border border-surface-border px-3 py-2"
        onPress={onBack}
      >
        <Label>Back</Label>
      </Pressable>

      <View accessibilityRole="header" className="gap-2">
        <Heading className="text-4xl leading-[36px]">{title}</Heading>
        <Muted className="text-sm leading-[19px]">{subtitle}</Muted>
      </View>
    </View>
  );
}

function LibraryExerciseCard({
  exercise,
  onPress,
}: {
  exercise: Exercise;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      className="mb-3 rounded-[24px] px-5 py-5"
      onPress={onPress}
      accessibilityLabel={`Open ${exercise.name}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Body className="font-heading text-2xl leading-[28px]">
            {exercise.name}
          </Body>
          <Muted className="mt-2 text-xs uppercase tracking-[1.3px]">
            {exercise.muscle_group}
          </Muted>
        </View>

        <Label>Open</Label>
      </View>

      <Muted className="mt-4 text-sm leading-[18px]">
        {exercise.how_to?.trim()
          ? exercise.how_to
          : 'Add how-to notes and review past logged sets from the detail page.'}
      </Muted>
    </Card>
  );
}

function LibraryRoutineCard({
  routine,
  exerciseCount,
  onPress,
}: {
  routine: Routine;
  exerciseCount: number;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      className="mb-3 rounded-[24px] px-5 py-5"
      onPress={onPress}
      accessibilityLabel={`Open ${routine.name}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Body className="font-heading text-2xl leading-[28px]">
            {routine.name}
          </Body>
          <Muted className="mt-2 text-sm leading-[18px]">
            {exerciseCount} exercises in this routine
          </Muted>
        </View>

        <Label>Open</Label>
      </View>
    </Card>
  );
}

function ExerciseDetailPage({
  exercise,
  onBack,
  onSave,
  onDelete,
  totalSessions,
  lastPerformedAt,
  bestCompletedWeight,
  history,
}: {
  exercise: Exercise | null;
  onBack: () => void;
  onSave: (input: NewExerciseInput) => void;
  onDelete: () => void;
  totalSessions: number;
  lastPerformedAt: number | null;
  bestCompletedWeight: number | null;
  history: {
    sessionId: string;
    sessionName: string;
    startTime: number;
    bestCompletedWeight: number;
    completedSets: number;
    totalSets: number;
    setSummary: string;
  }[];
}): React.JSX.Element {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [howTo, setHowTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(exercise?.name ?? '');
    setMuscleGroup(exercise?.muscle_group ?? '');
    setEquipment(exercise?.equipment ?? '');
    setHowTo(exercise?.how_to ?? '');
    setError(null);
  }, [exercise]);

  const handleSave = (): void => {
    const trimmedName = name.trim();
    const trimmedMuscleGroup = muscleGroup.trim();

    if (!trimmedName || !trimmedMuscleGroup) {
      setError('Exercise name and muscle group are required.');
      return;
    }

    setError(null);
    onSave({
      name: trimmedName,
      muscleGroup: trimmedMuscleGroup,
      howTo,
      equipment,
    });
  };

  const title = exercise?.name ?? 'New Exercise';
  const subtitle =
    exercise === null
      ? 'Create a reusable exercise with how-to notes you can keep revisiting.'
      : 'How-to guidance comes first, followed by your recent logged sessions.';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 28 }}
    >
      <PageHeader title={title} subtitle={subtitle} onBack={onBack} />

      {exercise ? (
        <>
          <Card label="How To" className="mb-4 rounded-[24px] px-5 py-5">
            <Muted className="text-sm leading-[19px]">
              {exercise.how_to?.trim()
                ? exercise.how_to
                : 'No how-to note yet. Add cues, setup reminders, or a short execution checklist below.'}
            </Muted>
          </Card>

          <Card label="History" className="mb-4 rounded-[24px] px-5 py-5">
            <View className="flex-row flex-wrap gap-3">
              <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
                <Label>Sessions</Label>
                <Body className="mt-2 font-heading text-2xl leading-[28px]">
                  {totalSessions}
                </Body>
              </View>
              <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
                <Label>Last Logged</Label>
                <Body className="mt-2">{formatDateLabel(lastPerformedAt)}</Body>
              </View>
              <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
                <Label>Best Weight</Label>
                <Body className="mt-2">
                  {bestCompletedWeight === null
                    ? 'None yet'
                    : bestCompletedWeight}
                </Body>
              </View>
            </View>

            <View className="mt-5 gap-3">
              {history.length > 0 ? (
                history.slice(0, 6).map((session) => (
                  <View
                    key={session.sessionId}
                    className="rounded-[18px] border border-surface-border/80 bg-surface-elevated px-4 py-4"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <Body className="font-medium">
                          {session.sessionName}
                        </Body>
                        <Muted className="mt-1 text-sm leading-[18px]">
                          {formatDateLabel(session.startTime)}
                        </Muted>
                      </View>
                      <Muted className="text-sm">
                        {session.completedSets}/{session.totalSets} completed
                      </Muted>
                    </View>

                    <Muted className="mt-3 text-sm leading-[18px]">
                      {session.setSummary}
                    </Muted>
                  </View>
                ))
              ) : (
                <Muted className="text-sm leading-[18px]">
                  No logged history for this exercise yet.
                </Muted>
              )}
            </View>
          </Card>
        </>
      ) : null}

      <Card
        label={exercise ? 'Exercise Details' : 'Create Exercise'}
        className="rounded-[24px] px-5 py-5"
      >
        <Label>Exercise name</Label>
        <Input
          className="mt-3"
          placeholder="Bench Press"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Label className="mt-4">Muscle group</Label>
        <Input
          className="mt-3"
          placeholder="Chest"
          value={muscleGroup}
          onChangeText={setMuscleGroup}
          autoCapitalize="words"
        />

        <Label className="mt-4">Equipment</Label>
        <Input
          className="mt-3"
          placeholder="Barbell, bench"
          value={equipment}
          onChangeText={setEquipment}
          autoCapitalize="words"
        />

        <Label className="mt-4">How-to</Label>
        <Input
          className="mt-3 min-h-[120px] pt-4"
          placeholder="Short setup cues, execution notes, and safety reminders"
          value={howTo}
          onChangeText={setHowTo}
          multiline
          numberOfLines={5}
          autoCapitalize="sentences"
        />

        {error ? <Muted className="mt-4 text-red-400">{error}</Muted> : null}

        <Button className="mt-5 w-full" onPress={handleSave}>
          {exercise ? 'Save Exercise' : 'Create Exercise'}
        </Button>

        {exercise ? (
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onPress={() =>
              Alert.alert(
                'Delete Exercise',
                `Delete ${exercise.name} and remove it from any routines?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: onDelete,
                  },
                ],
              )
            }
          >
            Delete Exercise
          </Button>
        ) : (
          <Button variant="ghost" className="mt-3 w-full" onPress={onBack}>
            Cancel
          </Button>
        )}
      </Card>
    </ScrollView>
  );
}

function RoutineExerciseEditor({
  draft,
  exerciseName,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangeTargetSets,
  onChangeTargetReps,
}: {
  draft: RoutineExerciseDraft;
  exerciseName: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChangeTargetSets: (value: string) => void;
  onChangeTargetReps: (value: string) => void;
}): React.JSX.Element {
  return (
    <View className="rounded-[20px] border border-surface-border/80 bg-surface-elevated px-4 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Body className="font-medium">{exerciseName}</Body>
          <Muted className="mt-1 text-sm">
            Reorder here before this routine lands in schedules and workouts.
          </Muted>
        </View>

        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move ${exerciseName} up`}
            className={`rounded-[14px] border px-3 py-2 ${
              isFirst
                ? 'border-surface-border/40 opacity-40'
                : 'border-surface-border'
            }`}
            disabled={isFirst}
            onPress={onMoveUp}
          >
            <Label>Up</Label>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Move ${exerciseName} down`}
            className={`rounded-[14px] border px-3 py-2 ${
              isLast
                ? 'border-surface-border/40 opacity-40'
                : 'border-surface-border'
            }`}
            disabled={isLast}
            onPress={onMoveDown}
          >
            <Label>Down</Label>
          </Pressable>
        </View>
      </View>

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1">
          <Label>Sets</Label>
          <Input
            className="mt-2"
            value={draft.targetSets}
            onChangeText={onChangeTargetSets}
            keyboardType="number-pad"
          />
        </View>
        <View className="flex-1">
          <Label>Reps</Label>
          <Input
            className="mt-2"
            value={draft.targetReps}
            onChangeText={onChangeTargetReps}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Button variant="ghost" className="mt-4 w-full" onPress={onRemove}>
        Remove Exercise
      </Button>
    </View>
  );
}

function RoutineDetailPage({
  routine,
  exercises,
  routineExercises,
  onBack,
  onSave,
  onDelete,
  completionCount,
  lastPerformedAt,
  averageVolume,
  averageDurationMinutes,
  recentSessions,
}: {
  routine: Routine | null;
  exercises: Exercise[];
  routineExercises: RoutineExercise[];
  onBack: () => void;
  onSave: (input: NewRoutineInput) => void;
  onDelete: () => void;
  completionCount: number;
  lastPerformedAt: number | null;
  averageVolume: number | null;
  averageDurationMinutes: number | null;
  recentSessions: {
    sessionId: string;
    routineName: string;
    startTime: number;
    endTime: number | null;
    totalVolume: number;
    completedSets: number;
    totalSets: number;
  }[];
}): React.JSX.Element {
  const [name, setName] = useState('');
  const [exerciseDrafts, setExerciseDrafts] = useState<RoutineExerciseDraft[]>(
    [],
  );
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addExerciseQuery, setAddExerciseQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(routine?.name ?? '');
    setExerciseDrafts(buildRoutineExerciseDrafts(routineExercises));
    setShowAddExercise(false);
    setAddExerciseQuery('');
    setError(null);
  }, [routine, routineExercises]);

  const selectedExerciseIds = useMemo(
    () => exerciseDrafts.map((entry) => entry.exerciseId),
    [exerciseDrafts],
  );

  const availableExercises = useMemo(() => {
    const query = normalizeQuery(addExerciseQuery);

    return exercises.filter((exercise) => {
      if (selectedExerciseIds.includes(exercise.id)) {
        return false;
      }

      if (query === '') {
        return true;
      }

      return (
        normalizeQuery(exercise.name).includes(query) ||
        normalizeQuery(exercise.muscle_group).includes(query)
      );
    });
  }, [addExerciseQuery, exercises, selectedExerciseIds]);

  const handleUpdateDraft = useCallback(
    (index: number, patch: Partial<RoutineExerciseDraft>): void => {
      setExerciseDrafts((current) =>
        current.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, ...patch } : entry,
        ),
      );
    },
    [],
  );

  const handleMoveDraft = useCallback(
    (index: number, direction: -1 | 1): void => {
      setExerciseDrafts((current) => {
        const nextIndex = index + direction;

        if (nextIndex < 0 || nextIndex >= current.length) {
          return current;
        }

        const nextDrafts = [...current];
        const [moved] = nextDrafts.splice(index, 1);
        nextDrafts.splice(nextIndex, 0, moved);
        return nextDrafts;
      });
    },
    [],
  );

  const handleRemoveDraft = useCallback((index: number): void => {
    setExerciseDrafts((current) =>
      current.filter((_, entryIndex) => entryIndex !== index),
    );
  }, []);

  const handleAddExercise = useCallback((exerciseId: string): void => {
    setExerciseDrafts((current) => [
      ...current,
      {
        exerciseId,
        targetSets: DEFAULT_TARGET_SETS,
        targetReps: DEFAULT_TARGET_REPS,
      },
    ]);
    setAddExerciseQuery('');
    setShowAddExercise(false);
  }, []);

  const handleSave = (): void => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Routine name is required.');
      return;
    }

    const nextExercises: RoutineExerciseInput[] = exerciseDrafts.map(
      (entry) => ({
        exerciseId: entry.exerciseId,
        targetSets: parsePositiveWholeNumber(entry.targetSets, 1),
        targetReps: parsePositiveWholeNumber(entry.targetReps, 1),
      }),
    );

    setError(null);
    onSave({
      name: trimmedName,
      exercises: nextExercises,
    });
  };

  const title = routine?.name ?? 'New Routine';
  const subtitle =
    routine === null
      ? 'Create a reusable routine template with ordered exercises and targets.'
      : 'Manage exercise order, targets, and simple progression context from one page.';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 28 }}
    >
      <PageHeader title={title} subtitle={subtitle} onBack={onBack} />

      {routine ? (
        <Card label="Progression" className="mb-4 rounded-[24px] px-5 py-5">
          <View className="flex-row flex-wrap gap-3">
            <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
              <Label>Completions</Label>
              <Body className="mt-2 font-heading text-2xl leading-[28px]">
                {completionCount}
              </Body>
            </View>
            <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
              <Label>Last Run</Label>
              <Body className="mt-2">{formatDateLabel(lastPerformedAt)}</Body>
            </View>
            <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
              <Label>Average</Label>
              <Body className="mt-2">{formatVolumeLabel(averageVolume)}</Body>
            </View>
          </View>

          <Muted className="mt-4 text-sm leading-[18px]">
            {formatDurationLabel(averageDurationMinutes)}
          </Muted>

          <View className="mt-5 gap-3">
            {recentSessions.length > 0 ? (
              recentSessions.slice(0, 5).map((session) => (
                <View
                  key={session.sessionId}
                  className="rounded-[18px] border border-surface-border/80 bg-surface-elevated px-4 py-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Body className="font-medium">{session.routineName}</Body>
                      <Muted className="mt-1 text-sm leading-[18px]">
                        {formatDateLabel(session.startTime)}
                      </Muted>
                    </View>
                    <Muted className="text-sm">
                      {Math.round(session.totalVolume)} volume
                    </Muted>
                  </View>

                  <Muted className="mt-3 text-sm leading-[18px]">
                    {session.completedSets}/{session.totalSets} completed sets
                  </Muted>
                </View>
              ))
            ) : (
              <Muted className="text-sm leading-[18px]">
                No completed history for this routine yet.
              </Muted>
            )}
          </View>
        </Card>
      ) : null}

      <Card
        label={routine ? 'Routine Builder' : 'Create Routine'}
        className="rounded-[24px] px-5 py-5"
      >
        <Label>Routine name</Label>
        <Input
          className="mt-3"
          placeholder="Push A"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <View className="mt-5 flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Label>Exercises</Label>
            <Muted className="mt-1 text-sm leading-[18px]">
              Ordered exactly how you want them to appear later in workout mode.
            </Muted>
          </View>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setShowAddExercise((current) => !current)}
          >
            {showAddExercise ? 'Close' : 'Add Exercise'}
          </Button>
        </View>

        {showAddExercise ? (
          <View className="mt-4 rounded-[20px] border border-surface-border/80 bg-surface-elevated px-4 py-4">
            <Input
              placeholder="Search exercises to add"
              value={addExerciseQuery}
              onChangeText={setAddExerciseQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View className="mt-4 gap-2">
              {availableExercises.length > 0 ? (
                availableExercises.map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${exercise.name} to routine`}
                    className="rounded-[16px] border border-surface-border bg-surface-card px-4 py-3"
                    onPress={() => handleAddExercise(exercise.id)}
                  >
                    <Body className="font-medium">{exercise.name}</Body>
                    <Muted className="mt-1 text-xs uppercase tracking-[1.2px]">
                      {exercise.muscle_group}
                    </Muted>
                  </Pressable>
                ))
              ) : (
                <Muted className="text-sm leading-[18px]">
                  No matching exercises available to add.
                </Muted>
              )}
            </View>
          </View>
        ) : null}

        <View className="mt-4 gap-3">
          {exerciseDrafts.length > 0 ? (
            exerciseDrafts.map((entry, index) => {
              const exerciseName =
                exercises.find((exercise) => exercise.id === entry.exerciseId)
                  ?.name ?? entry.exerciseId;

              return (
                <RoutineExerciseEditor
                  key={`${entry.exerciseId}-${index}`}
                  draft={entry}
                  exerciseName={exerciseName}
                  isFirst={index === 0}
                  isLast={index === exerciseDrafts.length - 1}
                  onMoveUp={() => handleMoveDraft(index, -1)}
                  onMoveDown={() => handleMoveDraft(index, 1)}
                  onRemove={() => handleRemoveDraft(index)}
                  onChangeTargetSets={(value) =>
                    handleUpdateDraft(index, { targetSets: value })
                  }
                  onChangeTargetReps={(value) =>
                    handleUpdateDraft(index, { targetReps: value })
                  }
                />
              );
            })
          ) : (
            <Muted className="rounded-[18px] border border-dashed border-surface-border px-4 py-4 text-sm leading-[18px]">
              No exercises added yet. Use the button above to build out this
              routine.
            </Muted>
          )}
        </View>

        {error ? <Muted className="mt-4 text-red-400">{error}</Muted> : null}

        <Button className="mt-5 w-full" onPress={handleSave}>
          {routine ? 'Save Routine' : 'Create Routine'}
        </Button>

        {routine ? (
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onPress={() =>
              Alert.alert(
                'Delete Routine',
                `Delete ${routine.name} and remove it from schedules?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: onDelete,
                  },
                ],
              )
            }
          >
            Delete Routine
          </Button>
        ) : (
          <Button variant="ghost" className="mt-3 w-full" onPress={onBack}>
            Cancel
          </Button>
        )}
      </Card>
    </ScrollView>
  );
}

export function RoutinesScreen(): React.JSX.Element {
  const [section, setSection] = useState<Section>('exercises');
  const [screenState, setScreenState] = useState<ScreenState>({
    kind: 'library',
  });
  const [searchQuery, setSearchQuery] = useState('');

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
  const { getExerciseInsight, getRoutineInsight } = useRoutineInsights();

  useFocusEffect(
    useCallback(() => {
      refreshExercises();
      refreshRoutines();
    }, [refreshExercises, refreshRoutines]),
  );

  useEffect(() => {
    if (screenState.kind === 'exercise' && screenState.exerciseId !== null) {
      const exists = exercises.some(
        (exercise) => exercise.id === screenState.exerciseId,
      );

      if (!exists) {
        setScreenState({ kind: 'library' });
      }
    }

    if (screenState.kind === 'routine' && screenState.routineId !== null) {
      const exists = routines.some(
        (routine) => routine.id === screenState.routineId,
      );

      if (!exists) {
        setScreenState({ kind: 'library' });
      }
    }
  }, [exercises, routines, screenState]);

  const filteredExercises = useMemo(() => {
    const query = normalizeQuery(searchQuery);

    return exercises.filter((exercise) => {
      if (query === '') {
        return true;
      }

      return (
        normalizeQuery(exercise.name).includes(query) ||
        normalizeQuery(exercise.muscle_group).includes(query)
      );
    });
  }, [exercises, searchQuery]);

  const filteredRoutines = useMemo(() => {
    const query = normalizeQuery(searchQuery);

    return routines.filter((routine) => {
      if (query === '') {
        return true;
      }

      return normalizeQuery(routine.name).includes(query);
    });
  }, [routines, searchQuery]);

  const selectedExercise =
    screenState.kind === 'exercise' && screenState.exerciseId !== null
      ? (exercises.find((exercise) => exercise.id === screenState.exerciseId) ??
        null)
      : null;
  const selectedRoutine =
    screenState.kind === 'routine' && screenState.routineId !== null
      ? (routines.find((routine) => routine.id === screenState.routineId) ??
        null)
      : null;
  const selectedRoutineExercises =
    selectedRoutine !== null ? getRoutineExercises(selectedRoutine.id) : [];
  const exerciseInsight =
    selectedExercise !== null
      ? getExerciseInsight(selectedExercise.id)
      : {
          totalSessions: 0,
          lastPerformedAt: null,
          bestCompletedWeight: null,
          history: [],
        };
  const routineInsight =
    selectedRoutine !== null
      ? getRoutineInsight(selectedRoutine.id)
      : {
          completionCount: 0,
          lastPerformedAt: null,
          averageVolume: null,
          averageDurationMinutes: null,
          recentSessions: [],
        };

  const handleBackToLibrary = useCallback((): void => {
    setScreenState({ kind: 'library' });
  }, []);

  const handleCreatePress = useCallback((): void => {
    setSearchQuery('');
    setScreenState(
      section === 'exercises'
        ? { kind: 'exercise', exerciseId: null }
        : { kind: 'routine', routineId: null },
    );
  }, [section]);

  const handleSaveExercise = useCallback(
    (input: NewExerciseInput): void => {
      if (screenState.kind !== 'exercise') {
        return;
      }

      if (screenState.exerciseId === null) {
        const createdExercise = createExercise(input);
        setSection('exercises');
        setScreenState({ kind: 'exercise', exerciseId: createdExercise.id });
        return;
      }

      updateExercise(screenState.exerciseId, input);
    },
    [createExercise, screenState, updateExercise],
  );

  const handleDeleteExercise = useCallback((): void => {
    if (selectedExercise === null) {
      return;
    }

    deleteExercise(selectedExercise.id);
    setSection('exercises');
    setScreenState({ kind: 'library' });
  }, [deleteExercise, selectedExercise]);

  const handleSaveRoutine = useCallback(
    (input: NewRoutineInput): void => {
      if (screenState.kind !== 'routine') {
        return;
      }

      if (screenState.routineId === null) {
        const createdRoutine = createRoutine(input);
        setSection('routines');
        setScreenState({ kind: 'routine', routineId: createdRoutine.id });
        return;
      }

      updateRoutine(screenState.routineId, input);
    },
    [createRoutine, screenState, updateRoutine],
  );

  const handleDeleteRoutine = useCallback((): void => {
    if (selectedRoutine === null) {
      return;
    }

    deleteRoutine(selectedRoutine.id);
    setSection('routines');
    setScreenState({ kind: 'library' });
  }, [deleteRoutine, selectedRoutine]);

  return (
    <Container>
      {screenState.kind === 'exercise' ? (
        <ExerciseDetailPage
          exercise={selectedExercise}
          onBack={handleBackToLibrary}
          onSave={handleSaveExercise}
          onDelete={handleDeleteExercise}
          totalSessions={exerciseInsight.totalSessions}
          lastPerformedAt={exerciseInsight.lastPerformedAt}
          bestCompletedWeight={exerciseInsight.bestCompletedWeight}
          history={exerciseInsight.history}
        />
      ) : screenState.kind === 'routine' ? (
        <RoutineDetailPage
          routine={selectedRoutine}
          exercises={exercises}
          routineExercises={selectedRoutineExercises}
          onBack={handleBackToLibrary}
          onSave={handleSaveRoutine}
          onDelete={handleDeleteRoutine}
          completionCount={routineInsight.completionCount}
          lastPerformedAt={routineInsight.lastPerformedAt}
          averageVolume={routineInsight.averageVolume}
          averageDurationMinutes={routineInsight.averageDurationMinutes}
          recentSessions={routineInsight.recentSessions}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <LibraryHeader
            section={section}
            exercisesCount={exercises.length}
            routinesCount={routines.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onChangeSection={setSection}
            onCreate={handleCreatePress}
          />

          <View className="pt-1">
            {section === 'exercises' ? (
              filteredExercises.length > 0 ? (
                filteredExercises.map((exercise) => (
                  <LibraryExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onPress={() =>
                      setScreenState({
                        kind: 'exercise',
                        exerciseId: exercise.id,
                      })
                    }
                  />
                ))
              ) : (
                <Card className="rounded-[24px] px-5 py-5">
                  <Body className="font-medium">No matching exercises</Body>
                  <Muted className="mt-2 text-sm leading-[18px]">
                    Try another search or create a new exercise from the button
                    above.
                  </Muted>
                </Card>
              )
            ) : filteredRoutines.length > 0 ? (
              filteredRoutines.map((routine) => (
                <LibraryRoutineCard
                  key={routine.id}
                  routine={routine}
                  exerciseCount={getRoutineExercises(routine.id).length}
                  onPress={() =>
                    setScreenState({
                      kind: 'routine',
                      routineId: routine.id,
                    })
                  }
                />
              ))
            ) : (
              <Card className="rounded-[24px] px-5 py-5">
                <Body className="font-medium">No matching routines</Body>
                <Muted className="mt-2 text-sm leading-[18px]">
                  Try another search or create a new routine from the button
                  above.
                </Muted>
              </Card>
            )}
          </View>
        </ScrollView>
      )}
    </Container>
  );
}
