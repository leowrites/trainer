import React from 'react';
import { View } from 'react-native';

import { Body, Caption, Card, Muted } from '@shared/components';
import {
  formatDurationMinutes,
  formatSessionDate,
  formatWeight,
} from '../formatters';
import type { HistorySession, WeightUnit } from '../types';

export function HistorySessionCard({
  session,
  unit,
  onPress,
}: {
  session: HistorySession;
  unit: WeightUnit;
  onPress: () => void;
}): React.JSX.Element {
  const exerciseLabel =
    session.exerciseCount === 1
      ? '1 exercise'
      : `${session.exerciseCount} exercises`;
  const setLabel =
    session.totalSets === 1 ? '1 set' : `${session.totalSets} sets`;

  return (
    <Card
      className="rounded-[24px] px-5 py-5"
      onPress={onPress}
      accessibilityLabel={`Open ${session.routineName}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Body className="font-heading text-2xl leading-[28px]">
            {session.routineName}
          </Body>
          <Muted className="mt-2 text-sm leading-[17px]">
            {formatSessionDate(session.startTime)}
          </Muted>
        </View>
        <Caption className="text-right text-muted-foreground">
          {formatWeight(session.totalVolume, unit)}
        </Caption>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-2">
        <Caption>{exerciseLabel}</Caption>
        <Caption>{setLabel}</Caption>
        <Caption>{formatDurationMinutes(session.durationMinutes)}</Caption>
      </View>
    </Card>
  );
}
