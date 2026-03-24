/**
 * Goals screen.
 *
 * CALLING SPEC:
 * - Route name: `Goals`
 * - Renders typed goal CRUD plus derived progress summaries from local history.
 * - Side effects: goal persistence only.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useExercises } from '@features/routines';
import { useHistoryAnalytics } from '@features/analytics';
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
import type { HistoryStackParamList } from '@features/analytics';
import { useTrainingGoals } from '../hooks/use-training-goals';
import type { TrainingGoalInput } from '../types';
import { GoalExercisePickerModal } from '../components/goal-exercise-picker-modal';

export type GoalsScreenProps = NativeStackScreenProps<
  HistoryStackParamList,
  'Goals'
>;

interface GoalFormState {
  id: string | null;
  goalType: TrainingGoalInput['goalType'];
  exerciseId: string | null;
  muscleGroup: string;
  targetLoad: string;
  targetReps: string;
  targetSessionsPerWeek: string;
  targetSetsPerWeek: string;
  targetWeeks: string;
}

const EMPTY_FORM: GoalFormState = {
  id: null,
  goalType: 'strength',
  exerciseId: null,
  muscleGroup: '',
  targetLoad: '',
  targetReps: '',
  targetSessionsPerWeek: '',
  targetSetsPerWeek: '',
  targetWeeks: '',
};

function parseOptionalNumber(value: string): number | null {
  const trimmedValue = value.trim();

  if (trimmedValue === '') {
    return null;
  }

  const parsedValue = Number.parseFloat(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseOptionalInteger(value: string): number | null {
  const parsedValue = parseOptionalNumber(value);
  return parsedValue === null ? null : Math.round(parsedValue);
}

export function GoalsScreen({}: GoalsScreenProps): React.JSX.Element {
  const { exercises } = useExercises();
  const { allSessions } = useHistoryAnalytics();
  const { goalViewModels, createGoal, updateGoal, deleteGoal } =
    useTrainingGoals(allSessions);
  const [form, setForm] = useState<GoalFormState>(EMPTY_FORM);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const exerciseNameById = useMemo(
    () =>
      exercises.reduce<Record<string, string>>((index, exercise) => {
        index[exercise.id] = exercise.name;
        return index;
      }, {}),
    [exercises],
  );
  const selectedExerciseName =
    form.exerciseId === null
      ? null
      : (exerciseNameById[form.exerciseId] ?? null);

  const handleSubmit = (): void => {
    const input: TrainingGoalInput = {
      goalType: form.goalType,
      exerciseId: form.exerciseId,
      muscleGroup: form.muscleGroup.trim() || null,
      targetLoad: parseOptionalNumber(form.targetLoad),
      targetReps: parseOptionalInteger(form.targetReps),
      targetSessionsPerWeek: parseOptionalInteger(form.targetSessionsPerWeek),
      targetSetsPerWeek: parseOptionalInteger(form.targetSetsPerWeek),
      targetWeeks: parseOptionalInteger(form.targetWeeks),
      status: 'active',
    };

    if (form.id) {
      updateGoal(form.id, input);
    } else {
      createGoal(input);
    }

    setForm(EMPTY_FORM);
  };

  return (
    <Container className="px-0 pb-0" edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View accessibilityRole="header" className="gap-2 pb-4">
          <Heading className="text-4xl leading-[36px]">Goals</Heading>
          <Muted className="text-sm leading-[19px]">
            Track strength, performance, adherence, and volume goals with the
            same local workout history that powers the intelligence engine.
          </Muted>
        </View>

        <Card className="rounded-[24px] px-5 py-5">
          <Label>Goal type</Label>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {(['strength', 'performance', 'adherence', 'volume'] as const).map(
              (goalType) => (
                <Button
                  key={goalType}
                  size="sm"
                  variant={form.goalType === goalType ? 'primary' : 'secondary'}
                  onPress={() =>
                    setForm((current) => ({ ...current, goalType }))
                  }
                >
                  {goalType}
                </Button>
              ),
            )}
          </View>

          {form.goalType === 'strength' || form.goalType === 'performance' ? (
            <>
              <Label className="mt-4">Exercise</Label>
              <Button
                className="mt-2 w-full justify-start"
                variant="secondary"
                onPress={() => setShowExercisePicker(true)}
              >
                {selectedExerciseName ?? 'Select exercise'}
              </Button>
              {selectedExerciseName ? (
                <Muted className="mt-2 text-sm">
                  Goal progress will map exactly to {selectedExerciseName}.
                </Muted>
              ) : (
                <Muted className="mt-2 text-sm">
                  Choose one exercise so the goal matches local history exactly.
                </Muted>
              )}
              <View className="mt-3 flex-row gap-3">
                <View className="flex-1">
                  <Label>Target load</Label>
                  <Input
                    className="mt-2"
                    value={form.targetLoad}
                    onChangeText={(targetLoad) =>
                      setForm((current) => ({ ...current, targetLoad }))
                    }
                    keyboardType="decimal-pad"
                    placeholder="100"
                  />
                </View>
                <View className="flex-1">
                  <Label>Target reps</Label>
                  <Input
                    className="mt-2"
                    value={form.targetReps}
                    onChangeText={(targetReps) =>
                      setForm((current) => ({ ...current, targetReps }))
                    }
                    keyboardType="number-pad"
                    placeholder="5"
                  />
                </View>
              </View>
            </>
          ) : null}

          {form.goalType === 'adherence' ? (
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Label>Sessions / week</Label>
                <Input
                  className="mt-2"
                  value={form.targetSessionsPerWeek}
                  onChangeText={(targetSessionsPerWeek) =>
                    setForm((current) => ({
                      ...current,
                      targetSessionsPerWeek,
                    }))
                  }
                  keyboardType="number-pad"
                  placeholder="3"
                />
              </View>
              <View className="flex-1">
                <Label>Goal weeks</Label>
                <Input
                  className="mt-2"
                  value={form.targetWeeks}
                  onChangeText={(targetWeeks) =>
                    setForm((current) => ({ ...current, targetWeeks }))
                  }
                  keyboardType="number-pad"
                  placeholder="8"
                />
              </View>
            </View>
          ) : null}

          {form.goalType === 'volume' ? (
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Label>Muscle group</Label>
                <Input
                  className="mt-2"
                  value={form.muscleGroup}
                  onChangeText={(muscleGroup) =>
                    setForm((current) => ({ ...current, muscleGroup }))
                  }
                  placeholder="quads"
                />
              </View>
              <View className="flex-1">
                <Label>Weekly sets</Label>
                <Input
                  className="mt-2"
                  value={form.targetSetsPerWeek}
                  onChangeText={(targetSetsPerWeek) =>
                    setForm((current) => ({ ...current, targetSetsPerWeek }))
                  }
                  keyboardType="number-pad"
                  placeholder="16"
                />
              </View>
            </View>
          ) : null}

          <View className="mt-4 flex-row gap-3">
            <Button className="flex-1" onPress={handleSubmit}>
              {form.id ? 'Update Goal' : 'Create Goal'}
            </Button>
            {form.id ? (
              <Button
                className="flex-1"
                variant="secondary"
                onPress={() => setForm(EMPTY_FORM)}
              >
                Cancel
              </Button>
            ) : null}
          </View>
        </Card>

        <View className="mt-5 gap-3">
          {goalViewModels.length === 0 ? (
            <Card className="rounded-[24px] px-5 py-5">
              <Body className="font-medium">No goals yet</Body>
              <Muted className="mt-2">
                Create a goal above to track progress against your local workout
                history.
              </Muted>
            </Card>
          ) : (
            goalViewModels.map((goalViewModel) => (
              <Card
                key={goalViewModel.goal.id}
                className="rounded-[24px] px-5 py-5"
              >
                <Body className="font-medium">{goalViewModel.title}</Body>
                <Muted className="mt-2">
                  {goalViewModel.progress.progressText}
                </Muted>
                <Muted className="mt-2">
                  Confidence: {goalViewModel.progress.quality.level}
                </Muted>
                <View className="mt-4 flex-row gap-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() =>
                      setForm({
                        id: goalViewModel.goal.id,
                        goalType: goalViewModel.goal.goal_type,
                        exerciseId: goalViewModel.goal.exercise_id ?? null,
                        muscleGroup: goalViewModel.goal.muscle_group ?? '',
                        targetLoad:
                          goalViewModel.goal.target_load === null
                            ? ''
                            : String(goalViewModel.goal.target_load),
                        targetReps:
                          goalViewModel.goal.target_reps === null
                            ? ''
                            : String(goalViewModel.goal.target_reps),
                        targetSessionsPerWeek:
                          goalViewModel.goal.target_sessions_per_week === null
                            ? ''
                            : String(
                                goalViewModel.goal.target_sessions_per_week,
                              ),
                        targetSetsPerWeek:
                          goalViewModel.goal.target_sets_per_week === null
                            ? ''
                            : String(goalViewModel.goal.target_sets_per_week),
                        targetWeeks:
                          goalViewModel.goal.target_weeks === null
                            ? ''
                            : String(goalViewModel.goal.target_weeks),
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => deleteGoal(goalViewModel.goal.id)}
                  >
                    Delete
                  </Button>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      <GoalExercisePickerModal
        visible={showExercisePicker}
        exercises={exercises}
        selectedExerciseId={form.exerciseId}
        onClose={() => setShowExercisePicker(false)}
        onSelectExercise={(exerciseId) =>
          setForm((current) => ({ ...current, exerciseId }))
        }
      />
    </Container>
  );
}
