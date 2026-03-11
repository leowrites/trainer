import React from 'react';
import { Text, View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarChartDataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  maxValue: number;
  /** Formats the value displayed above each bar. Defaults to rounding to 1 decimal place. */
  formatValue?: (value: number) => string;
  /** Tailwind background colour class for the bars, e.g. `'bg-primary-400'`. */
  barClassName?: string;
  emptyMessage?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Simple vertical bar chart built with NativeWind / React Native Views.
 * No external charting library required.
 */
export function BarChart({
  data,
  maxValue,
  formatValue = (v: number): string => v.toFixed(1),
  barClassName = 'bg-primary-400',
  emptyMessage = 'No data yet',
}: BarChartProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <View className="h-32 items-center justify-center">
        <Text className="text-muted text-sm">{emptyMessage}</Text>
      </View>
    );
  }

  const safeMax = maxValue > 0 ? maxValue : 1;

  return (
    <View className="flex-row items-end h-36 gap-1">
      {data.map((point, i) => {
        const heightFraction = point.value / safeMax;
        return (
          <View key={i} className="flex-1 items-center justify-end gap-0.5">
            {point.value > 0 && (
              <Text
                className="text-muted-foreground text-[8px]"
                numberOfLines={1}
              >
                {formatValue(point.value)}
              </Text>
            )}
            <View
              className={`w-full rounded-t-sm ${barClassName}`}
              style={{
                height: `${Math.max(heightFraction * 100, point.value > 0 ? 4 : 0)}%`,
              }}
            />
            <Text className="text-muted text-[8px]" numberOfLines={1}>
              {point.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
