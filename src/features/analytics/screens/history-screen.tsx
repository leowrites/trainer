import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';

import {
  useExerciseCapabilities,
  useIntelligenceOverview,
  useTrainingGoals,
} from '@features/intelligence';
import { Button, Caption, Container, Heading, Muted } from '@shared/components';
import { DEFAULT_PROGRESSION_CONFIG } from '../constants';
import { HistoryChartCard } from '../components/history-chart-card';
import { HistorySessionCard } from '../components/history-session-card';
import { useHistoryAnalytics } from '../hooks/use-history-analytics';
import type { HistoryStackParamList } from '../navigation-types';
import type {
  HistoryTrendMetric,
  HistoryTrendRange,
  ProgressiveOverloadConfig,
} from '../types';

export interface HistoryScreenProps {
  navigation?: NativeStackNavigationProp<
    HistoryStackParamList,
    'HistoryOverview'
  >;
  progressionConfig?: ProgressiveOverloadConfig;
}

export function HistoryScreen({
  navigation,
  progressionConfig = DEFAULT_PROGRESSION_CONFIG,
}: HistoryScreenProps = {}): React.JSX.Element {
  const [activeMetric, setActiveMetric] =
    useState<HistoryTrendMetric>('volume');
  const [activeRange, setActiveRange] = useState<HistoryTrendRange>('3m');
  const {
    isLoading,
    isLoadingMore,
    hasMore,
    allSessions,
    sessions,
    trendSeriesByMetric,
    loadMore,
    refresh,
  } = useHistoryAnalytics({ trendRange: activeRange });
  const { capabilitiesByExerciseId, refresh: refreshExerciseCapabilities } =
    useExerciseCapabilities();
  const { goalViewModels } = useTrainingGoals(allSessions, {
    capabilitiesByExerciseId,
  });
  const {
    exerciseTrendSummaries,
    routineTrendSummaries,
    goalViewModels: overviewGoalViewModels,
  } = useIntelligenceOverview(allSessions, goalViewModels, {
    capabilitiesByExerciseId,
  });
  const hasHandledInitialFocus = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasHandledInitialFocus.current) {
        hasHandledInitialFocus.current = true;
        return undefined;
      }

      refresh();
      refreshExerciseCapabilities();
      return undefined;
    }, [refresh, refreshExerciseCapabilities]),
  );

  return (
    <Container className="px-0 pb-0" edges={['left', 'right']}>
      <FlatList
        data={sessions}
        keyExtractor={(session) => session.id}
        renderItem={({ item: session }) => (
          <View className="pt-2">
            <HistorySessionCard
              session={session}
              unit={progressionConfig.unit}
              onPress={() =>
                navigation?.navigate('HistorySessionDetail', {
                  sessionId: session.id,
                  session,
                })
              }
            />
          </View>
        )}
        ListHeaderComponent={
          <>
            <View className="pb-4">
              <View accessibilityRole="header" className="gap-2">
                <Heading className="text-4xl leading-[36px]">History</Heading>
                <Muted className="text-sm leading-[19px]">
                  Review past sessions, progression trends, and session-level
                  detail in modal view.
                </Muted>
              </View>
            </View>

            <HistoryChartCard
              activeMetric={activeMetric}
              activeRange={activeRange}
              onChangeMetric={setActiveMetric}
              onChangeRange={setActiveRange}
              trendSeriesByMetric={trendSeriesByMetric}
              unit={progressionConfig.unit}
            />

            <View className="pb-2 pt-3">
              <View className="flex-row items-center justify-between gap-3">
                <Heading className="text-2xl leading-[24px]">Sessions</Heading>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => navigation?.navigate('Goals')}
                >
                  Goals
                </Button>
              </View>
              <Muted className="mt-2 text-sm leading-[17px]">
                Open a session to inspect exercise details and progression cues.
              </Muted>
            </View>

            {exerciseTrendSummaries.length > 0 ? (
              <View className="pb-2">
                <Heading className="text-2xl leading-[24px]">
                  Exercise Trends
                </Heading>
                <View className="mt-3 gap-3">
                  {exerciseTrendSummaries.map((summary) => (
                    <View
                      key={summary.exerciseId}
                      className="rounded-[24px] border border-surface-border/80 bg-surface-card px-5 py-5"
                    >
                      <Caption className="font-medium text-foreground">
                        {summary.exerciseName}
                      </Caption>
                      <Muted className="mt-2">{summary.summary}</Muted>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {routineTrendSummaries.length > 0 ? (
              <View className="pb-2">
                <Heading className="text-2xl leading-[24px]">
                  Routine Trends
                </Heading>
                <View className="mt-3 gap-3">
                  {routineTrendSummaries.map((summary) => (
                    <View
                      key={summary.routineId}
                      className="rounded-[24px] border border-surface-border/80 bg-surface-card px-5 py-5"
                    >
                      <Caption className="font-medium text-foreground">
                        {summary.routineName}
                      </Caption>
                      <Muted className="mt-2">{summary.summary}</Muted>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {overviewGoalViewModels.length > 0 ? (
              <View className="pb-2">
                <Heading className="text-2xl leading-[24px]">Goals</Heading>
                <View className="mt-3 gap-3">
                  {overviewGoalViewModels.slice(0, 3).map((goalViewModel) => (
                    <View
                      key={goalViewModel.goal.id}
                      className="rounded-[24px] border border-surface-border/80 bg-surface-card px-5 py-5"
                    >
                      <Caption className="font-medium text-foreground">
                        {goalViewModel.title}
                      </Caption>
                      <Muted className="mt-2">
                        {goalViewModel.progress.progressText}
                      </Muted>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View className="pt-2">
            {isLoading ? (
              <View className="rounded-[24px] border border-surface-border/80 bg-surface-card px-5 py-5">
                <Caption className="font-medium text-foreground">
                  Loading history
                </Caption>
                <Muted className="mt-2">
                  Fetching your recent workout sessions.
                </Muted>
              </View>
            ) : (
              <View className="rounded-[24px] border border-surface-border/80 bg-surface-card px-5 py-5">
                <Caption className="font-medium text-foreground">
                  No workout history yet
                </Caption>
                <Muted className="mt-2">
                  Completed sessions will appear here with routine, date, set
                  totals, and duration.
                </Muted>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View className="pb-2 pt-4">
              <Muted className="text-sm leading-[17px]">
                Loading more sessions...
              </Muted>
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasMore) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      />
    </Container>
  );
}
