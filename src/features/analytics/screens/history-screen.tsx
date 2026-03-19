import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  Badge,
  Body,
  Caption,
  Card,
  Container,
  DisclosureCard,
  Heading,
  Label,
  Muted,
} from '@shared/components';
import { TrendCard } from '../components/trend-card';
import { recommendProgressions } from '../domain/progressive-overload';
import {
  formatCompactNumber,
  formatDurationMinutes,
  formatSessionDate,
  formatSessionDateTime,
  formatSessionSummary,
  formatWeight,
} from '../formatters';
import { useHistoryAnalytics } from '../hooks/use-history-analytics';
import type {
  HistoryExerciseSummary,
  HistorySession,
  ProgressiveOverloadConfig,
  ProgressiveOverloadRecommendation,
} from '../types';

const DEFAULT_PROGRESSION_CONFIG: ProgressiveOverloadConfig = {
  weightIncrement: 5,
  unit: 'kg',
  precision: 1,
};

interface HistoryScreenProps {
  progressionConfig?: ProgressiveOverloadConfig;
}

function summarizeExerciseSets(exercise: HistoryExerciseSummary): string {
  const reps = exercise.sets.map((set) => set.reps).join(' / ');
  const weights = [...new Set(exercise.sets.map((set) => set.weight))];
  const weightLabel =
    weights.length === 1
      ? `${formatCompactNumber(weights[0])}`
      : weights.map((weight) => formatCompactNumber(weight)).join(', ');

  return `${exercise.completedSets}/${exercise.totalSets} sets • ${reps} reps • ${weightLabel}`;
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
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      sets: exercise.sets.map((set) => ({
        reps: set.reps,
        weight: set.weight,
        isCompleted: set.isCompleted,
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
                    {recommendation.targetReps} reps.
                  </Caption>
                </View>
                <Badge variant="accent">
                  +{formatCompactNumber(recommendation.weightIncrement)}{' '}
                  {config.unit}
                </Badge>
              </View>
              <Caption className="mt-2">
                {formatWeight(recommendation.currentWeight, config.unit)} to{' '}
                {formatWeight(recommendation.recommendedWeight, config.unit)}
              </Caption>
            </Card>
          ),
        )}
      </View>
    </View>
  );
}

function SessionDetail({
  session,
  progressionConfig,
}: {
  session: HistorySession;
  progressionConfig: ProgressiveOverloadConfig;
}): React.JSX.Element {
  const recommendations = useMemo(
    () => buildRecommendations(session, progressionConfig),
    [session, progressionConfig],
  );

  return (
    <>
      <View className="flex-row flex-wrap gap-3">
        <Card className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
          <Label>Date</Label>
          <Body className="mt-2">
            {formatSessionDateTime(session.startTime)}
          </Body>
        </Card>
        <Card className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
          <Label>Duration</Label>
          <Body className="mt-2">
            {formatDurationMinutes(session.durationMinutes)}
          </Body>
        </Card>
        <Card className="min-w-[110px] flex-1 rounded-[18px] bg-surface-elevated px-4 py-4">
          <Label>Volume</Label>
          <Body className="mt-2">
            {formatWeight(session.totalVolume, progressionConfig.unit)}
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
    </>
  );
}

function HistoryList({
  sessions,
  expandedSessionId,
  onToggleSession,
  progressionConfig,
}: {
  sessions: HistorySession[];
  expandedSessionId: string | null;
  onToggleSession: (sessionId: string) => void;
  progressionConfig: ProgressiveOverloadConfig;
}): React.JSX.Element {
  return (
    <View className="mt-2">
      {sessions.map((session: HistorySession) => {
        const expanded = expandedSessionId === session.id;

        return (
          <DisclosureCard
            key={session.id}
            title={session.routineName}
            expanded={expanded}
            onToggle={() => onToggleSession(session.id)}
            accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${session.routineName}`}
            headerMeta={
              <>
                <Caption className="mt-1">
                  {formatSessionDate(session.startTime)}
                </Caption>
                <Caption className="mt-1">
                  {formatSessionSummary(session)}
                </Caption>
                {session.durationMinutes !== null ? (
                  <Caption className="mt-1">
                    {formatDurationMinutes(session.durationMinutes)}
                  </Caption>
                ) : null}
              </>
            }
          >
            <SessionDetail
              session={session}
              progressionConfig={progressionConfig}
            />
          </DisclosureCard>
        );
      })}
    </View>
  );
}

export function HistoryScreen({
  progressionConfig = DEFAULT_PROGRESSION_CONFIG,
}: HistoryScreenProps = {}): React.JSX.Element {
  const { sessions, volumeTrend, hoursTrend, refresh } = useHistoryAnalytics();
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );
  const hasHandledInitialFocus = useRef(false);
  const hasAutoExpanded = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasHandledInitialFocus.current) {
        hasHandledInitialFocus.current = true;
        return undefined;
      }

      refresh();
      return undefined;
    }, [refresh]),
  );

  useEffect(() => {
    if (sessions.length === 0) {
      setExpandedSessionId(null);
      hasAutoExpanded.current = false;
      return;
    }

    if (!hasAutoExpanded.current && expandedSessionId === null) {
      hasAutoExpanded.current = true;
      setExpandedSessionId(sessions[0].id);
      return;
    }

    if (
      expandedSessionId !== null &&
      !sessions.some(
        (session: HistorySession) => session.id === expandedSessionId,
      )
    ) {
      setExpandedSessionId(sessions[0].id);
    }
  }, [sessions, expandedSessionId]);

  const latestSession = sessions[0] ?? null;

  return (
    <Container className="px-0 pb-0" edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View className="pb-4">
          <View accessibilityRole="header" className="gap-2">
            <Heading className="text-4xl leading-[36px]">History</Heading>
            <Muted className="text-sm leading-[19px]">
              Review past sessions, volume trends, and simple progression cues.
            </Muted>
          </View>
        </View>

        <View className="pb-4">
          <Card label="Latest Session" className="rounded-[24px] px-5 py-5">
            {latestSession ? (
              <>
                <Body className="font-heading text-2xl leading-[30px]">
                  {latestSession.routineName}
                </Body>
                <Muted className="mt-2 text-sm leading-[17px]">
                  {formatSessionDate(latestSession.startTime)} •{' '}
                  {formatSessionSummary(latestSession)}
                </Muted>
                <Muted className="mt-1 text-sm leading-[17px]">
                  {formatDurationMinutes(latestSession.durationMinutes)} •{' '}
                  {formatWeight(
                    latestSession.totalVolume,
                    progressionConfig.unit,
                  )}{' '}
                  volume
                </Muted>
              </>
            ) : (
              <Muted>No sessions recorded yet.</Muted>
            )}
          </Card>
        </View>

        <View>
          <TrendCard
            title="Volume Over Time"
            points={volumeTrend}
            unit={progressionConfig.unit}
            accentClassName="bg-accent"
            emptyMessage="Complete a workout to start tracking volume over time."
          />

          <TrendCard
            title="Hours Over Time"
            points={hoursTrend}
            unit="hr"
            accentClassName="bg-secondary"
            emptyMessage="Finished sessions with an end time will show up here."
          />
        </View>

        <View className="pb-2 pt-3">
          <Heading className="text-2xl leading-[24px]">Sessions</Heading>
          <Muted className="mt-2 text-sm leading-[17px]">
            Expand a session to inspect exercise details and recommendations.
          </Muted>
        </View>

        {sessions.length > 0 ? (
          <View className="pt-2">
            <HistoryList
              sessions={sessions}
              expandedSessionId={expandedSessionId}
              onToggleSession={(sessionId: string) =>
                setExpandedSessionId((currentValue: string | null) =>
                  currentValue === sessionId ? null : sessionId,
                )
              }
              progressionConfig={progressionConfig}
            />
          </View>
        ) : (
          <View className="pt-2">
            <Card className="rounded-[24px] px-5 py-5">
              <Body className="font-medium">No workout history yet</Body>
              <Muted className="mt-2">
                Completed sessions will appear here with routine, date, set
                summaries, and duration.
              </Muted>
            </Card>
          </View>
        )}
      </ScrollView>
    </Container>
  );
}
