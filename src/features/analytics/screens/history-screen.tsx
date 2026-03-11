import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { palette } from '@core/theme';
import { BarChart } from '../components/bar-chart';
import { formatHours, maxHours } from '../domain/hours-over-time';
import { formatVolume, maxVolume } from '../domain/volume-over-time';
import { useAnalytics } from '../hooks/use-analytics';

export function HistoryScreen(): React.JSX.Element {
  const { volumeData, hoursData } = useAnalytics(30);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="px-4 pt-12 pb-8 gap-6"
    >
      <Text className="text-foreground text-2xl font-bold">Analytics</Text>

      {/* ── Volume over time ─────────────────────────────────────────────── */}
      <View className="bg-surface-card rounded-xl p-4 gap-3">
        <View className="gap-0.5">
          <Text className="text-foreground text-base font-semibold">
            Volume over time
          </Text>
          <Text className="text-muted text-xs">
            Total weight lifted (kg × reps) — last 30 days
          </Text>
        </View>
        <BarChart
          data={volumeData.map((p) => ({ label: p.label, value: p.volume }))}
          maxValue={maxVolume(volumeData)}
          formatValue={formatVolume}
          barColor={palette.green400}
          emptyMessage="Complete workouts to see volume trends"
        />
      </View>

      {/* ── Hours over time ──────────────────────────────────────────────── */}
      <View className="bg-surface-card rounded-xl p-4 gap-3">
        <View className="gap-0.5">
          <Text className="text-foreground text-base font-semibold">
            Hours over time
          </Text>
          <Text className="text-muted text-xs">
            Total workout duration — last 30 days
          </Text>
        </View>
        <BarChart
          data={hoursData.map((p) => ({ label: p.label, value: p.hours }))}
          maxValue={maxHours(hoursData)}
          formatValue={formatHours}
          barColor={palette.amber}
          emptyMessage="Complete workouts to see duration trends"
        />
      </View>
    </ScrollView>
  );
}
