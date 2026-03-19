import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useFocusEffect } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React, {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, FlatList, Pressable, ScrollView, View } from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import type { Exercise, Routine, RoutineExercise } from '@core/database/types';
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
import type { NewExerciseInput } from '../hooks/use-exercises';
import { useRoutineInsights } from '../hooks/use-routine-insights';
import { useRoutines } from '../hooks/use-routines';
import type { NewRoutineInput } from '../hooks/use-routines';

const DEFAULT_TARGET_SETS = '3';
const DEFAULT_TARGET_REPS = '10';

type Section = 'exercises' | 'routines';
type RoutinesStackParamList = {
  Library: undefined;
  ExerciseDetail: { exerciseId: string };
  RoutineDetail: { routineId: string };
};

export interface ExerciseDetailScreenProps {
  exerciseId: string;
  navigation: {
    goBack: () => void;
    setOptions: (options: { title?: string }) => void;
  };
}

interface RoutineExerciseDraft {
  exerciseId: string;
  targetSets: string;
  targetReps: string;
}

const Stack = createNativeStackNavigator<RoutinesStackParamList>();

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
        <View className="flex-row">
          <Body className="font-heading text-2xl leading-[28px]">
            {exercise.name}
          </Body>
        </View>
        <Muted className="mt-2 text-xs uppercase tracking-[1.3px]">
          {exercise.muscle_group}
        </Muted>
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
      </View>
    </Card>
  );
}

function EditorSheet({
  visible,
  onClose,
  children,
}: React.PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
}>): React.JSX.Element | null {
  const { colorMode, tokens } = useTheme();
  const sheetRef = useRef<TrueSheet>(null);
  const latestVisibleRef = useRef(visible);
  const isPresentedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    latestVisibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

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
      setShouldRender(false);
      return;
    }

    isTransitioningRef.current = true;
    void sheetRef.current?.dismiss().catch(() => {
      isTransitioningRef.current = false;
      setShouldRender(false);
    });
  }, [shouldRender, visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <TrueSheet
      ref={sheetRef}
      detents={['auto', 1]}
      cornerRadius={28}
      grabber
      scrollable
      backgroundColor={tokens.bgBase}
      backgroundBlur={colorMode === 'dark' ? 'dark' : 'light'}
      onDidPresent={() => {
        isPresentedRef.current = true;
        isTransitioningRef.current = false;
      }}
      onDidDismiss={() => {
        isPresentedRef.current = false;
        isTransitioningRef.current = false;
        setShouldRender(false);

        if (latestVisibleRef.current) {
          onClose();
        }
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 32,
        }}
      >
        {children}
      </ScrollView>
    </TrueSheet>
  );
}

function ExerciseEditorSheet({
  visible,
  exercise,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (input: NewExerciseInput) => void;
  onDelete?: () => void;
}): React.JSX.Element | null {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [howTo, setHowTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(exercise?.name ?? '');
    setMuscleGroup(exercise?.muscle_group ?? '');
    setEquipment(exercise?.equipment ?? '');
    setHowTo(exercise?.how_to ?? '');
    setError(null);
  }, [exercise, visible]);

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

  return (
    <EditorSheet visible={visible} onClose={onClose}>
      <Heading className="text-2xl leading-[28px]">
        {exercise ? 'Edit Exercise' : 'Create Exercise'}
      </Heading>
      <Muted className="mt-2 text-sm leading-[18px]">
        Capture the setup cues and metadata you want available on the detail
        page later.
      </Muted>

      <Label className="mt-5">Exercise name</Label>
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

      <Button variant="ghost" className="mt-3 w-full" onPress={onClose}>
        {exercise ? 'Cancel Edit' : 'Cancel'}
      </Button>

      {exercise && onDelete ? (
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
      ) : null}
    </EditorSheet>
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

function RoutineEditorSheet({
  visible,
  routine,
  exercises,
  routineExercises,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  routine: Routine | null;
  exercises: Exercise[];
  routineExercises: RoutineExercise[];
  onClose: () => void;
  onSave: (input: NewRoutineInput) => void;
  onDelete?: () => void;
}): React.JSX.Element | null {
  const [name, setName] = useState('');
  const [exerciseDrafts, setExerciseDrafts] = useState<RoutineExerciseDraft[]>(
    [],
  );
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addExerciseQuery, setAddExerciseQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(routine?.name ?? '');
    setExerciseDrafts(buildRoutineExerciseDrafts(routineExercises));
    setShowAddExercise(false);
    setAddExerciseQuery('');
    setError(null);
  }, [routine, routineExercises, visible]);

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

    setError(null);
    onSave({
      name: trimmedName,
      exercises: exerciseDrafts.map((entry) => ({
        exerciseId: entry.exerciseId,
        targetSets: parsePositiveWholeNumber(entry.targetSets, 1),
        targetReps: parsePositiveWholeNumber(entry.targetReps, 1),
      })),
    });
  };

  return (
    <EditorSheet visible={visible} onClose={onClose}>
      <Heading className="text-2xl leading-[28px]">
        {routine ? 'Edit Routine' : 'Create Routine'}
      </Heading>
      <Muted className="mt-2 text-sm leading-[18px]">
        Build the exercise order and targets exactly how you want them to appear
        later in workout mode.
      </Muted>

      <Label className="mt-5">Routine name</Label>
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
                key={entry.exerciseId}
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

      <Button variant="ghost" className="mt-3 w-full" onPress={onClose}>
        {routine ? 'Cancel Edit' : 'Cancel'}
      </Button>

      {routine && onDelete ? (
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
      ) : null}
    </EditorSheet>
  );
}

function ExerciseDetailPage({
  exercise,
  totalSessions,
  lastPerformedAt,
  bestCompletedWeight,
  history,
  onEdit,
}: {
  exercise: Exercise;
  totalSessions: number;
  lastPerformedAt: number | null;
  bestCompletedWeight: number | null;
  history: {
    sessionId: string;
    sessionName: string;
    startTime: number;
    bestCompletedWeight: number | null;
    completedSets: number;
    totalSets: number;
    setSummary: string;
  }[];
  onEdit: () => void;
}): React.JSX.Element {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 28 }}
    >
      <Card label="Overview" className="mb-4 rounded-[24px] px-5 py-5">
        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
            <Label>Muscle Group</Label>
            <Body className="mt-2">{exercise.muscle_group}</Body>
          </View>
          <View className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
            <Label>Equipment</Label>
            <Body className="mt-2">
              {exercise.equipment?.trim() ? exercise.equipment : 'None'}
            </Body>
          </View>
          <Button className="w-full" onPress={onEdit}>
            Edit Exercise
          </Button>
        </View>
      </Card>

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
              {bestCompletedWeight === null ? 'None yet' : bestCompletedWeight}
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
                    <Body className="font-medium">{session.sessionName}</Body>
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
    </ScrollView>
  );
}

function RoutineDetailPage({
  exercises,
  routineExercises,
  completionCount,
  lastPerformedAt,
  averageVolume,
  averageDurationMinutes,
  recentSessions,
  onEdit,
}: {
  exercises: Exercise[];
  routineExercises: RoutineExercise[];
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
  onEdit: () => void;
}): React.JSX.Element {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 28 }}
    >
      <Card label="Exercises" className="mb-4 rounded-[24px] px-5 py-5">
        <View className="gap-3">
          {routineExercises.length > 0 ? (
            routineExercises.map((entry, index) => {
              const exerciseName =
                exercises.find((exercise) => exercise.id === entry.exercise_id)
                  ?.name ?? entry.exercise_id;

              return (
                <View
                  key={entry.id}
                  className="rounded-[18px] border border-surface-border/80 bg-surface-elevated px-4 py-4"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Body className="font-medium">{exerciseName}</Body>
                      <Muted className="mt-1 text-sm leading-[18px]">
                        Exercise {index + 1}
                      </Muted>
                    </View>
                    <Muted className="text-sm">
                      {entry.target_sets} x {entry.target_reps}
                    </Muted>
                  </View>
                </View>
              );
            })
          ) : (
            <Muted className="text-sm leading-[18px]">
              No exercises added to this routine yet.
            </Muted>
          )}
          <Button className="w-full" onPress={onEdit}>
            Edit Routine
          </Button>
        </View>
      </Card>

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
    </ScrollView>
  );
}

function RoutinesLibraryScreen({
  navigation,
  section,
  setSection,
  searchQuery,
  setSearchQuery,
  exercises,
  routines,
  routineExerciseCounts,
  createExercise,
  createRoutine,
}: NativeStackScreenProps<RoutinesStackParamList, 'Library'> & {
  section: Section;
  setSection: React.Dispatch<React.SetStateAction<Section>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  exercises: Exercise[];
  routines: Routine[];
  routineExerciseCounts: Record<string, number>;
  createExercise: (input: NewExerciseInput) => Exercise;
  createRoutine: (input: NewRoutineInput) => Routine;
}): React.JSX.Element {
  const [isExerciseSheetOpen, setIsExerciseSheetOpen] = useState(false);
  const [isRoutineSheetOpen, setIsRoutineSheetOpen] = useState(false);

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

  const handleChangeSection = useCallback(
    (nextSection: Section): void => {
      startTransition(() => {
        setSection(nextSection);
      });
    },
    [setSection],
  );

  const handleCreatePress = useCallback((): void => {
    setSearchQuery('');

    if (section === 'exercises') {
      setIsExerciseSheetOpen(true);
      return;
    }

    setIsRoutineSheetOpen(true);
  }, [section, setSearchQuery]);

  const libraryHeader = (
    <LibraryHeader
      section={section}
      exercisesCount={exercises.length}
      routinesCount={routines.length}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onChangeSection={handleChangeSection}
      onCreate={handleCreatePress}
    />
  );

  return (
    <Container>
      {section === 'exercises' ? (
        <FlatList
          data={filteredExercises}
          keyExtractor={(exercise) => exercise.id}
          renderItem={({ item }) => (
            <LibraryExerciseCard
              exercise={item}
              onPress={() =>
                navigation.navigate('ExerciseDetail', {
                  exerciseId: item.id,
                })
              }
            />
          )}
          ListHeaderComponent={libraryHeader}
          ListEmptyComponent={
            <Card className="rounded-[24px] px-5 py-5">
              <Body className="font-medium">No matching exercises</Body>
              <Muted className="mt-2 text-sm leading-[18px]">
                Try another search or create a new exercise from the button
                above.
              </Muted>
            </Card>
          }
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredRoutines}
          keyExtractor={(routine) => routine.id}
          renderItem={({ item }) => (
            <LibraryRoutineCard
              routine={item}
              exerciseCount={routineExerciseCounts[item.id] ?? 0}
              onPress={() =>
                navigation.navigate('RoutineDetail', {
                  routineId: item.id,
                })
              }
            />
          )}
          ListHeaderComponent={libraryHeader}
          ListEmptyComponent={
            <Card className="rounded-[24px] px-5 py-5">
              <Body className="font-medium">No matching routines</Body>
              <Muted className="mt-2 text-sm leading-[18px]">
                Try another search or create a new routine from the button
                above.
              </Muted>
            </Card>
          }
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ExerciseEditorSheet
        visible={isExerciseSheetOpen}
        exercise={null}
        onClose={() => setIsExerciseSheetOpen(false)}
        onSave={(input) => {
          const createdExercise = createExercise(input);
          setIsExerciseSheetOpen(false);
          navigation.navigate('ExerciseDetail', {
            exerciseId: createdExercise.id,
          });
        }}
      />

      <RoutineEditorSheet
        visible={isRoutineSheetOpen}
        routine={null}
        exercises={exercises}
        routineExercises={[]}
        onClose={() => setIsRoutineSheetOpen(false)}
        onSave={(input) => {
          const createdRoutine = createRoutine(input);
          setIsRoutineSheetOpen(false);
          navigation.navigate('RoutineDetail', {
            routineId: createdRoutine.id,
          });
        }}
      />
    </Container>
  );
}

export function ExerciseDetailScreen({
  exerciseId,
  navigation,
}: ExerciseDetailScreenProps): React.JSX.Element {
  const { exercises, hasLoaded, updateExercise, deleteExercise } =
    useExercises();
  const { getExerciseInsight } = useRoutineInsights();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const selectedExercise =
    exercises.find((exercise) => exercise.id === exerciseId) ?? null;

  useEffect(() => {
    if (selectedExercise === null && hasLoaded) {
      navigation.goBack();
      return;
    }

    if (selectedExercise) {
      navigation.setOptions({
        title: selectedExercise.name,
      });
    }
  }, [hasLoaded, navigation, selectedExercise]);

  if (selectedExercise === null) {
    return (
      <Container>
        <View />
      </Container>
    );
  }

  const exerciseInsight = getExerciseInsight(selectedExercise.id);

  return (
    <Container>
      <ExerciseDetailPage
        exercise={selectedExercise}
        onEdit={() => setIsEditorOpen(true)}
        totalSessions={exerciseInsight.totalSessions}
        lastPerformedAt={exerciseInsight.lastPerformedAt}
        bestCompletedWeight={exerciseInsight.bestCompletedWeight}
        history={exerciseInsight.history}
      />

      <ExerciseEditorSheet
        visible={isEditorOpen}
        exercise={selectedExercise}
        onClose={() => setIsEditorOpen(false)}
        onSave={(input) => {
          updateExercise(selectedExercise.id, input);
          setIsEditorOpen(false);
        }}
        onDelete={() => {
          deleteExercise(selectedExercise.id);
          setIsEditorOpen(false);
          navigation.goBack();
        }}
      />
    </Container>
  );
}

function RoutinesRoutineDetailScreen({
  route,
  navigation,
  exercises,
  routines,
  updateRoutine,
  deleteRoutine,
  getRoutineExercises,
  getRoutineInsight,
}: NativeStackScreenProps<RoutinesStackParamList, 'RoutineDetail'> & {
  exercises: Exercise[];
  routines: Routine[];
  updateRoutine: (routineId: string, input: NewRoutineInput) => void;
  deleteRoutine: (routineId: string) => void;
  getRoutineExercises: (routineId: string) => RoutineExercise[];
  getRoutineInsight: ReturnType<typeof useRoutineInsights>['getRoutineInsight'];
}): React.JSX.Element {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const selectedRoutine =
    routines.find((routine) => routine.id === route.params.routineId) ?? null;

  useEffect(() => {
    if (selectedRoutine === null) {
      navigation.goBack();
      return;
    }

    navigation.setOptions({
      title: selectedRoutine.name,
    });
  }, [navigation, selectedRoutine]);

  if (selectedRoutine === null) {
    return (
      <Container>
        <View />
      </Container>
    );
  }

  const selectedRoutineExercises = getRoutineExercises(selectedRoutine.id);
  const routineInsight = getRoutineInsight(selectedRoutine.id);

  return (
    <Container>
      <RoutineDetailPage
        exercises={exercises}
        routineExercises={selectedRoutineExercises}
        completionCount={routineInsight.completionCount}
        lastPerformedAt={routineInsight.lastPerformedAt}
        averageVolume={routineInsight.averageVolume}
        averageDurationMinutes={routineInsight.averageDurationMinutes}
        recentSessions={routineInsight.recentSessions}
        onEdit={() => setIsEditorOpen(true)}
      />

      <RoutineEditorSheet
        visible={isEditorOpen}
        routine={selectedRoutine}
        exercises={exercises}
        routineExercises={selectedRoutineExercises}
        onClose={() => setIsEditorOpen(false)}
        onSave={(input) => {
          updateRoutine(selectedRoutine.id, input);
          setIsEditorOpen(false);
        }}
        onDelete={() => {
          deleteRoutine(selectedRoutine.id);
          setIsEditorOpen(false);
          navigation.goBack();
        }}
      />
    </Container>
  );
}

export function RoutinesScreen(): React.JSX.Element {
  const { tokens } = useTheme();
  const [section, setSection] = useState<Section>('exercises');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    exercises,
    refresh: refreshExercises,
    createExercise,
  } = useExercises();
  const {
    routines,
    refresh: refreshRoutines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    getRoutineExercises,
    getRoutineExerciseCounts,
  } = useRoutines();
  const { getRoutineInsight } = useRoutineInsights();

  useFocusEffect(
    useCallback(() => {
      refreshExercises();
      refreshRoutines();
    }, [refreshExercises, refreshRoutines]),
  );

  const routineExerciseCounts = getRoutineExerciseCounts();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: tokens.textPrimary,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: {
          backgroundColor: tokens.bgBase,
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: tokens.bgBase,
        },
      }}
    >
      <Stack.Screen name="Library" options={{ headerShown: false }}>
        {(props) => (
          <RoutinesLibraryScreen
            {...props}
            section={section}
            setSection={setSection}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            exercises={exercises}
            routines={routines}
            routineExerciseCounts={routineExerciseCounts}
            createExercise={createExercise}
            createRoutine={createRoutine}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="ExerciseDetail">
        {(props) => (
          <ExerciseDetailScreen
            exerciseId={props.route.params.exerciseId}
            navigation={props.navigation}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="RoutineDetail">
        {(props) => (
          <RoutinesRoutineDetailScreen
            {...props}
            exercises={exercises}
            routines={routines}
            updateRoutine={updateRoutine}
            deleteRoutine={deleteRoutine}
            getRoutineExercises={getRoutineExercises}
            getRoutineInsight={getRoutineInsight}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
