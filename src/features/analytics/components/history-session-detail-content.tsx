import React, { useMemo } from 'react';
import { View } from 'react-native';

import {
  useSessionIntelligence,
  useTrainingGoals,
} from '@features/intelligence';
import { Badge, Body, Caption, Card, Label } from '@shared/components';
import { recommendProgressions } from '../domain/progressive-overload';
import {
  formatCompactNumber,
  formatDurationMinutes,
  formatWeight,
} from '../formatters';
import type {
  HistoryExerciseSummary,
  HistorySession,
  ProgressiveOverloadConfig,
  ProgressiveOverloadRecommendation,
} from '../types';

function summarizeExerciseSets(exercise: HistoryExerciseSummary): string {
  const reps = exercise.sets.map((set) => set.reps).join(' / ');
  const weights = [...new Set(exercise.sets.map((set) => set.weight))];
  const weightLabel =
    weights.length === 1
      ? formatCompactNumber(weights[0])
      : weights.map((weight) => formatCompactNumber(weight)).join(', ');

  return `${exercise.totalSets} sets • ${reps} reps • ${weightLabel}`;
}

function buildRecommendations(
  session: HistorySession,
  config: ProgressiveOverloadConfig,
): ProgressiveOverloadRecommendation[] {
  if (session.endTime === null) {
    return [];
  }

  return recommendProgressions(
    session.exercises.map((exercise: HistoryExerciseSummary) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      progressionPolicy: exercise.progressionPolicy,
      targetRir: exercise.targetRir,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      targetRepsMin: exercise.targetRepsMin,
      targetRepsMax: exercise.targetRepsMax,
      sets: exercise.sets.map((set) => ({
        reps: set.reps,
        weight: set.weight,
        isCompleted: set.isCompleted,
        actualRir: set.actualRir,
        setRole: set.setRole,
      })),
    })),
    config,
  );
}

function RecommendationStrip({
  recommendations,
  config,
}: {
  recommendations: ProgressiveOverloadRecommendation[];
  config: ProgressiveOverloadConfig;
}): React.JSX.Element | null {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <View className="mt-4">
      <Label className="mb-2">Progression Next Time</Label>
      <View className="gap-2">
        {recommendations.map(
          (recommendation: ProgressiveOverloadRecommendation) => (
            <Card
              key={recommendation.exerciseId}
              className="rounded-xl border-accent bg-surface-elevated"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Body className="font-medium">
                    {recommendation.exerciseName}
                  </Body>
                  <Caption className="mt-1">
                    All {recommendation.completedSetCount} sets hit{' '}
                    {recommendation.targetRepsMin}
                    {recommendation.targetRepsMax > recommendation.targetRepsMin
                      ? `-${recommendation.targetRepsMax}`
                      : ''}{' '}
                    reps.
                  </Caption>
                </View>
                <Badge variant="accent">
                  +{formatCompactNumber(recommendation.weightIncrement)}{' '}
                  {config.unit}
                </Badge>
              </View>
              <Caption className="mt-2">{recommendation.reason}</Caption>
            </Card>
          ),
        )}
      </View>
    </View>
  );
}

export function HistorySessionDetailContent({
  session,
  progressionConfig,
}: {
  session: HistorySession;
  progressionConfig: ProgressiveOverloadConfig;
}): React.JSX.Element {
  const { goalViewModels } = useTrainingGoals([session]);
  const recommendations = useMemo(
    () => buildRecommendations(session, progressionConfig),
    [session, progressionConfig],
  );
  const intelligence = useSessionIntelligence(
    session,
    [session],
    goalViewModels,
    progressionConfig.unit,
  );

  return (
    <>
      <View className="flex-row flex-wrap gap-3">
        <Card className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
          <Label>Volume</Label>
          <Body className="mt-2">
            {formatWeight(session.totalVolume, progressionConfig.unit)}
          </Body>
        </Card>
        <Card className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
          <Label>Duration</Label>
          <Body className="mt-2">
            {formatDurationMinutes(session.durationMinutes)}
          </Body>
        </Card>
      </View>

      <View className="mt-5 gap-3">
        {session.exercises.map((exercise: HistoryExerciseSummary) => (
          <Card
            key={exercise.exerciseId}
            className="rounded-[18px] bg-surface-elevated px-4 py-4"
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Body className="font-medium">{exercise.exerciseName}</Body>
                <Caption className="mt-1">
                  {summarizeExerciseSets(exercise)}
                </Caption>
              </View>
              <Caption>
                {formatWeight(exercise.totalVolume, progressionConfig.unit)}
              </Caption>
            </View>
          </Card>
        ))}
      </View>

      <RecommendationStrip
        recommendations={recommendations}
        config={progressionConfig}
      />

      {intelligence.negativeSignals.length > 0 ? (
        <View className="mt-4 gap-2">
          <Label>Classification</Label>
          {intelligence.negativeSignals.map((badge) => (
            <Card
              key={badge.id}
              className="rounded-xl border-surface-border bg-surface-elevated"
            >
              <Badge variant={badge.tone}>{badge.label}</Badge>
              <Caption className="mt-2">{badge.detail}</Caption>
            </Card>
          ))}
        </View>
      ) : null}

      {intelligence.prescriptions.length > 0 ? (
        <View className="mt-4 gap-2">
          <Label>Conservative Next Step</Label>
          {intelligence.prescriptions.map((prescription) => (
            <Card
              key={prescription.exerciseId}
              className="rounded-xl border-surface-border bg-surface-elevated"
            >
              <Body className="font-medium">{prescription.exerciseName}</Body>
              <Caption className="mt-2">{prescription.reason}</Caption>
            </Card>
          ))}
        </View>
      ) : null}
    </>
  );
}
