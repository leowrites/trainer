import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

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
  const { sessions, trendSeriesByMetric, refresh } = useHistoryAnalytics({
    trendRange: activeRange,
  });
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View className="pb-4">
          <View accessibilityRole="header" className="gap-2">
            <Heading className="text-4xl leading-[36px]">History</Heading>
            <Muted className="text-sm leading-[19px]">
              Review past sessions, progression trends, and session-level detail
              in modal view.
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

        {sessions.length > 0 ? (
          <View className="gap-3 pt-2">
            {sessions.map((session) => (
              <HistorySessionCard
                key={session.id}
                session={session}
                unit={progressionConfig.unit}
                onPress={() =>
                  navigation?.navigate('HistorySessionDetail', {
                    sessionId: session.id,
                  })
                }
              />
            ))}
          </View>
        ) : (
          <View className="pt-2">
            <View className="rounded-[24px] border border-surface-border/80 bg-surface-card px-5 py-5">
              <Caption className="font-medium text-foreground">
                No workout history yet
              </Caption>
              <Muted className="mt-2">
                Completed sessions will appear here with routine, date, set
                totals, and duration.
              </Muted>
            </View>
          </View>
        )}
      </ScrollView>
    </Container>
  );
}
