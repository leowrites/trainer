import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface BarDataPoint {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: BarDataPoint[];
  height?: number;
  color?: string;
  unit?: string;
}

export default function SimpleBarChart({
  data,
  height = 120,
  color = '#6200EE',
  unit = '',
}: SimpleBarChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.empty}>No data yet</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.barsRow}>
        {data.map((d, i) => {
          const barHeight = Math.max((d.value / maxVal) * (height - 30), 2);
          return (
            <View key={i} style={styles.barCol}>
              {d.value > 0 && (
                <Text style={styles.valueLabel}>{d.value}{unit}</Text>
              )}
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: d.value > 0 ? color : '#e0e0e0',
                  },
                ]}
              />
              <Text style={styles.barLabel} numberOfLines={1}>{d.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 8,
  },
  empty: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#ccc',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  bar: {
    width: '80%',
    borderRadius: 3,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  valueLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
});
