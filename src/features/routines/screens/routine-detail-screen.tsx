import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import type { Exercise, RoutineExercise } from '@core/database/types';
import {
  Body,
  Button,
  Card,
  Container,
  Label,
  Muted,
} from '@shared/components';
import { RoutineEditorSheet } from '../components/routine-editor-sheet';
import { useExercises } from '../hooks/use-exercises';
import { useRoutineInsights } from '../hooks/use-routine-insights';
import { useRoutines } from '../hooks/use-routines';
import type { RoutinesStackParamList } from '../types';
import {
  formatDateLabel,
  formatDurationLabel,
  formatVolumeLabel,
} from '../utils/formatters';

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
  const headerHeight = useHeaderHeight();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      contentContainerStyle={{
        paddingTop: headerHeight + 8,
        paddingBottom: 28,
      }}
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

export function RoutineDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<
  RoutinesStackParamList,
  'RoutineDetail'
>): React.JSX.Element {
  const { exercises } = useExercises();
  const { routines, updateRoutine, deleteRoutine, getRoutineExercises } =
    useRoutines();
  const { getRoutineInsight } = useRoutineInsights();

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
    <Container edges={['left', 'right']}>
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
