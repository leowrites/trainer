import React from 'react';
import { Text, View } from 'react-native';
import { BarChart as GiftedBarChart } from 'react-native-gifted-charts';

import { palette } from '@core/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarChartDataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  maxValue: number;
  /** Formats the value displayed as a top label on each bar. */
  formatValue?: (value: number) => string;
  /** Hex colour for the bars. Defaults to the primary-400 green. */
  barColor?: string;
  emptyMessage?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// gifted-charts requires plain style objects (no NativeWind) for its own text elements.
const topLabelStyle = {
  color: palette.mutedForeground,
  fontSize: 8,
  marginBottom: 2,
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Bar chart wrapper around `react-native-gifted-charts`.
 * Applies app design-token colours and handles the empty state.
 */
export function BarChart({
  data,
  maxValue,
  formatValue = (v: number): string => v.toFixed(1),
  barColor = palette.green400,
  emptyMessage = 'No data yet',
}: BarChartProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <View className="h-32 items-center justify-center">
        <Text className="text-muted text-sm">{emptyMessage}</Text>
      </View>
    );
  }

  const chartData = data.map((point) => ({
    value: point.value,
    label: point.label,
    topLabelComponent: (): React.JSX.Element => (
      <Text style={topLabelStyle} numberOfLines={1}>
        {point.value > 0 ? formatValue(point.value) : ''}
      </Text>
    ),
  }));

  return (
    <GiftedBarChart
      data={chartData}
      maxValue={maxValue > 0 ? maxValue : 1}
      frontColor={barColor}
      barBorderRadius={3}
      noOfSections={3}
      yAxisTextStyle={{ color: palette.muted, fontSize: 9 }}
      xAxisLabelTextStyle={{ color: palette.muted, fontSize: 8 }}
      backgroundColor={palette.surface}
      yAxisColor={palette.border}
      xAxisColor={palette.border}
      rulesColor={palette.border}
      isAnimated
    />
  );
}
