import { LineChart, type lineDataItem } from 'react-native-gifted-charts';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import { Body, Card, Heading, Label, Muted } from '@shared/components';
import { formatCompactNumber } from '../formatters';
import type {
  HistoryTrendMetric,
  HistoryTrendRange,
  HistoryTrendSeriesByMetric,
  TrendPoint,
  WeightUnit,
} from '../types';

const METRIC_OPTIONS: Array<{
  key: HistoryTrendMetric;
  label: string;
}> = [
  { key: 'volume', label: 'Volume' },
  { key: 'hours', label: 'Hours' },
  { key: 'reps', label: 'Reps' },
  { key: 'sets', label: 'Sets' },
];

const RANGE_OPTIONS: Array<{
  key: HistoryTrendRange;
  label: string;
}> = [
  { key: '3m', label: 'Last 3 Months' },
  { key: '1y', label: 'Last Year' },
  { key: 'all', label: 'All Time' },
];

function formatMetricValue(
  metric: HistoryTrendMetric,
  value: number,
  unit: WeightUnit,
): string {
  if (metric === 'volume') {
    return `${formatCompactNumber(value)} ${unit}`;
  }

  if (metric === 'hours') {
    return `${formatCompactNumber(value)} hr`;
  }

  return formatCompactNumber(value);
}

function getMetricCaption(metric: HistoryTrendMetric): string {
  switch (metric) {
    case 'hours':
      return 'Workout hours over time';
    case 'reps':
      return 'Completed reps over time';
    case 'sets':
      return 'Logged sets over time';
    default:
      return 'Training volume over time';
  }
}

function getRangeCaption(range: HistoryTrendRange): string {
  if (range === '1y') {
    return 'Last year';
  }

  if (range === 'all') {
    return 'All time';
  }

  return 'Last 3 months';
}

function buildChartData(points: TrendPoint[]): lineDataItem[] {
  return points.map((point: TrendPoint) => ({
    value: Number(point.value.toFixed(1)),
    label: point.label,
  }));
}

export function HistoryChartCard({
  activeMetric,
  activeRange,
  onChangeMetric,
  onChangeRange,
  trendSeriesByMetric,
  unit,
}: {
  activeMetric: HistoryTrendMetric;
  activeRange: HistoryTrendRange;
  onChangeMetric: (metric: HistoryTrendMetric) => void;
  onChangeRange: (range: HistoryTrendRange) => void;
  trendSeriesByMetric: HistoryTrendSeriesByMetric;
  unit: WeightUnit;
}): React.JSX.Element {
  const { tokens } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const points = trendSeriesByMetric[activeMetric];
  const chartData = useMemo(() => buildChartData(points), [points]);
  const chartSpacing =
    activeRange === 'all' ? 72 : activeRange === '1y' ? 56 : 42;
  const viewportWidth = Math.max(windowWidth - 84, 240);
  const chartWidth = Math.max(
    viewportWidth,
    chartData.length * chartSpacing + 28,
  );
  const maxValue = chartData.reduce(
    (currentMax: number, item: lineDataItem) =>
      Math.max(currentMax, item.value ?? 0),
    0,
  );
  const totalValue = points.reduce(
    (sum: number, point: TrendPoint) => sum + point.value,
    0,
  );

  return (
    <Card label="Progression" className="rounded-[24px] px-5 py-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
      >
        {METRIC_OPTIONS.map((option) => {
          const selected = option.key === activeMetric;

          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${option.label}`}
              onPress={() => onChangeMetric(option.key)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selected ? tokens.accent : tokens.bgBorder,
                backgroundColor: selected ? tokens.bgCard : tokens.bgBase,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  color: selected ? tokens.accent : tokens.textMuted,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
      >
        {RANGE_OPTIONS.map((option) => {
          const selected = option.key === activeRange;

          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${option.label}`}
              onPress={() => onChangeRange(option.key)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selected ? tokens.secondary : tokens.bgBorder,
                backgroundColor: selected ? tokens.bgCard : tokens.bgBase,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text
                style={{
                  color: selected ? tokens.secondary : tokens.textMuted,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {points.length > 0 ? (
        <>
          <View className="mt-3">
            <Heading className="text-4xl leading-[42px] text-foreground">
              {formatMetricValue(activeMetric, totalValue, unit)}
            </Heading>
            <Body className="mt-1 text-sm text-muted-foreground">
              {getMetricCaption(activeMetric)} • {getRangeCaption(activeRange)}
            </Body>
            <Muted className="mt-1 text-xs leading-[16px] text-muted-foreground">
              Total across {points.length} timeline point
              {points.length === 1 ? '' : 's'} in range
            </Muted>
          </View>

          <View className="mt-5 overflow-hidden rounded-[18px] bg-surface-elevated px-2 py-4">
            <LineChart
              key={`${activeMetric}-${activeRange}-${chartData.length}`}
              data={chartData}
              width={chartWidth}
              areaChart
              adjustToWidth={false}
              disableScroll={false}
              scrollToEnd={false}
              hideDataPoints
              noOfSections={4}
              mostNegativeValue={0}
              maxValue={maxValue === 0 ? 1 : Math.ceil(maxValue * 1.1)}
              color={tokens.accent}
              startFillColor={tokens.accent}
              endFillColor={tokens.accent}
              startOpacity={0.3}
              endOpacity={0.1}
              rulesColor={tokens.bgBorder}
              xAxisColor={tokens.bgBorder}
              yAxisThickness={0}
              spacing={chartSpacing}
              xAxisLabelTextStyle={{
                color: tokens.textMuted,
                fontSize: 11,
              }}
              yAxisTextStyle={{
                color: tokens.textMuted,
                fontSize: 11,
              }}
              yAxisLabelWidth={48}
              showFractionalValues={activeMetric === 'hours'}
              roundToDigits={activeMetric === 'hours' ? 1 : 0}
            />
          </View>
        </>
      ) : (
        <View className="pt-5">
          <Label>No data yet</Label>
          <Muted className="mt-2">
            Complete a workout to start tracking this metric over time.
          </Muted>
        </View>
      )}
    </Card>
  );
}
