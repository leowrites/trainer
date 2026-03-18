import React from 'react';
import { View } from 'react-native';

import { Body, Card, Caption, Heading, Muted } from '@shared/components';
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
    <Card label={title} className="mb-4 rounded-[20px] px-4 py-4">
      {latestPoint ? (
        <>
          <View>
            <View className="flex-row items-end gap-2">
              <Heading className="text-4xl leading-[42px] text-foreground">
                {formatCompactNumber(latestPoint.value)}
              </Heading>
              <Body className="pb-1 text-sm font-semibold uppercase text-muted-foreground">
                {unit}
              </Body>
            </View>
            <Muted className="mt-2 text-xs leading-[16px] text-muted-foreground">
              Last {points.length} workout days
            </Muted>
          </View>

          <View className="mt-4 flex-row items-end gap-2">
            {points.map((point: TrendPoint) => (
              <View key={point.key} className="flex-1 items-center">
                <View className="h-16 w-full justify-end rounded-[14px] bg-surface-elevated px-1.5 pb-1.5">
                  <View
                    className={`w-full rounded-[10px] ${accentClassName}`}
                    style={{
                      height: buildBarHeight(point.value, maxValue),
                    }}
                  />
                </View>
                <Caption className="mt-2 text-xs text-muted-foreground">
                  {point.label}
                </Caption>
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
