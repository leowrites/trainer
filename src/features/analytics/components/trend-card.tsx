import React from 'react';
import { View } from 'react-native';

import { Card, Caption, Muted, StatRow } from '@shared/components';
import { formatCompactNumber } from '../formatters';
import type { TrendPoint } from '../types';

interface TrendCardProps {
  title: string;
  points: TrendPoint[];
  unit: string;
  accentClassName: string;
  emptyMessage: string;
}

function buildBarHeight(value: number, maxValue: number): number {
  if (value <= 0 || maxValue <= 0) {
    return 0;
  }

  const normalizedHeight = (value / maxValue) * 56;
  return Math.max(8, Math.round(normalizedHeight));
}

export function TrendCard({
  title,
  points,
  unit,
  accentClassName,
  emptyMessage,
}: TrendCardProps): React.JSX.Element {
  const latestPoint = points.at(-1) ?? null;
  const maxValue = points.reduce(
    (currentMax: number, point: TrendPoint) =>
      Math.max(currentMax, point.value),
    0,
  );

  return (
    <Card label={title} className="mb-4 rounded-xl">
      {latestPoint ? (
        <>
          <StatRow
            value={formatCompactNumber(latestPoint.value)}
            unit={unit}
            sub={`Last ${points.length} workout days`}
          />

          <View className="mt-4 flex-row items-end gap-2">
            {points.map((point: TrendPoint) => (
              <View key={point.key} className="flex-1 items-center">
                <View className="h-16 w-full justify-end rounded-lg bg-surface-elevated px-1 pb-1">
                  <View
                    className={`w-full rounded-md ${accentClassName}`}
                    style={{
                      height: buildBarHeight(point.value, maxValue),
                    }}
                  />
                </View>
                <Caption className="mt-2">{point.label}</Caption>
              </View>
            ))}
          </View>
        </>
      ) : (
        <Muted>{emptyMessage}</Muted>
      )}
    </Card>
  );
}
