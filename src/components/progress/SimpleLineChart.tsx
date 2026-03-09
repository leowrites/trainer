import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface DataPoint {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  unit?: string;
}

export default function SimpleLineChart({
  data,
  width = 300,
  height = 120,
  color = '#6200EE',
  unit = '',
}: SimpleLineChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.empty}>No data yet</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const pointRadius = 4;

  const points = data.map((d, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding + (1 - (d.value - min) / range) * chartHeight,
    value: d.value,
    label: d.label,
  }));

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Y axis labels */}
      <View style={[styles.yLabels, { height: chartHeight, top: padding }]}>
        <Text style={styles.axisLabel}>{max.toFixed(1)}{unit}</Text>
        <Text style={styles.axisLabel}>{min.toFixed(1)}{unit}</Text>
      </View>
      {/* Lines between points */}
      <View style={StyleSheet.absoluteFillObject}>
        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const dx = p.x - prev.x;
          const dy = p.y - prev.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={`line-${i}`}
              style={[
                styles.line,
                {
                  width: length,
                  backgroundColor: color,
                  left: prev.x,
                  top: prev.y,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
        {/* Dots */}
        {points.map((p, i) => (
          <View
            key={`dot-${i}`}
            style={[
              styles.dot,
              {
                left: p.x - pointRadius,
                top: p.y - pointRadius,
                backgroundColor: color,
                width: pointRadius * 2,
                height: pointRadius * 2,
                borderRadius: pointRadius,
              },
            ]}
          />
        ))}
      </View>
      {/* X labels for first and last */}
      {data.length > 0 && (
        <View style={[styles.xLabels, { top: height - padding + 2 }]}>
          <Text style={styles.axisLabel}>{data[0].label}</Text>
          {data.length > 1 && <Text style={styles.axisLabel}>{data[data.length - 1].label}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  empty: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#ccc',
    padding: 16,
  },
  yLabels: {
    position: 'absolute',
    left: 2,
    justifyContent: 'space-between',
  },
  xLabels: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: 10,
    color: '#aaa',
  },
  line: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
  },
});
