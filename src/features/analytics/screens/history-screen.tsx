import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Caption, Container, Heading, Muted } from '@shared/components';
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

interface HistoryScreenProps {
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
    sessions,
    trendSeriesByMetric,
    loadMore,
    refresh,
  } = useHistoryAnalytics({ trendRange: activeRange });
  const hasHandledInitialFocus = useRef(false);

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
              <Heading className="text-2xl leading-[24px]">Sessions</Heading>
              <Muted className="mt-2 text-sm leading-[17px]">
                Open a session to inspect exercise details and progression cues.
              </Muted>
            </View>
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
