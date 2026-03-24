import { useFocusEffect } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect } from 'react';
import { ScrollView, View } from 'react-native';

import type { Exercise } from '@core/database/types';
import {
  Body,
  Button,
  Card,
  Container,
  Label,
  Muted,
} from '@shared/components';
import { useExerciseInsight } from '../hooks/use-exercise-insight';
import { useExercises } from '../hooks/use-exercises';
import type { RoutinesStackParamList } from '../types';
import { formatDateLabel } from '../utils/formatters';

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

export type ExerciseDetailScreenProps = NativeStackScreenProps<
  RoutinesStackParamList,
  'ExerciseDetail'
>;

export function ExerciseDetailScreen({
  route,
  navigation,
}: ExerciseDetailScreenProps): React.JSX.Element {
  const { exercises, hasLoaded, refresh } = useExercises();
  const { insight, refresh: refreshInsight } = useExerciseInsight(
    route.params.exerciseId,
  );

  const selectedExercise =
    exercises.find((exercise) => exercise.id === route.params.exerciseId) ??
    null;

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshInsight();
    }, [refresh, refreshInsight]),
  );

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

  return (
    <Container edges={['left', 'right']}>
      <ExerciseDetailPage
        exercise={selectedExercise}
        onEdit={() =>
          navigation.navigate('ExerciseEditor', {
            exerciseId: selectedExercise.id,
          })
        }
        totalSessions={insight.totalSessions}
        lastPerformedAt={insight.lastPerformedAt}
        bestCompletedWeight={insight.bestCompletedWeight}
        history={insight.history}
      />
    </Container>
  );
}
