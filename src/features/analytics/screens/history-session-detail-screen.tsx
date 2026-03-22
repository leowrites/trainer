import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { Body, Card, Container, Heading, Muted } from '@shared/components';
import { DEFAULT_PROGRESSION_CONFIG } from '../constants';
import { HistorySessionDetailContent } from '../components/history-session-detail-content';
import { formatSessionDate } from '../formatters';
import { useHistorySessionDetail } from '../hooks/use-history-session-detail';
import type { HistoryStackParamList } from '../navigation-types';
import type { ProgressiveOverloadConfig } from '../types';

export interface HistorySessionDetailScreenProps {
  route: RouteProp<HistoryStackParamList, 'HistorySessionDetail'>;
  navigation: NativeStackNavigationProp<
    HistoryStackParamList,
    'HistorySessionDetail'
  >;
  progressionConfig?: ProgressiveOverloadConfig;
}

export function HistorySessionDetailScreen({
  route,
  progressionConfig = DEFAULT_PROGRESSION_CONFIG,
}: HistorySessionDetailScreenProps): React.JSX.Element {
  const { isLoading, session } = useHistorySessionDetail(
    route.params.sessionId,
    route.params.session ?? null,
  );

  return (
    <Container className="px-0 pb-0" edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {session ? (
          <>
            <View accessibilityRole="header" className="gap-2 pb-4">
              <Heading className="text-4xl leading-[36px]">
                {session.routineName}
              </Heading>
              <Muted className="text-sm leading-[19px]">
                {formatSessionDate(session.startTime)}
              </Muted>
            </View>

            <HistorySessionDetailContent
              session={session}
              progressionConfig={progressionConfig}
            />
          </>
        ) : isLoading ? (
          <Card className="rounded-[24px] px-5 py-5">
            <Body className="font-medium">Loading session</Body>
            <Muted className="mt-2">
              Fetching workout details for this history entry.
            </Muted>
          </Card>
        ) : (
          <Card className="rounded-[24px] px-5 py-5">
            <Body className="font-medium">Session unavailable</Body>
            <Muted className="mt-2">
              This workout session could not be found. It may have been removed
              or its history has changed since you opened it.
            </Muted>
          </Card>
        )}
      </ScrollView>
    </Container>
  );
}
