import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { getMuscleColor, MUSCLE_GROUP_LABELS } from '../../utils/muscleGroups';

interface MuscleHeatmapProps {
  muscleCounts: Record<string, number>;
}

export default function MuscleHeatmap({ muscleCounts }: MuscleHeatmapProps) {
  const muscles = Object.keys(MUSCLE_GROUP_LABELS);
  const maxCount = Math.max(...Object.values(muscleCounts), 1);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {muscles.map((muscle) => {
          const count = muscleCounts[muscle] || 0;
          const intensity = count / maxCount;
          const baseColor = getMuscleColor(muscle);
          const opacity = 0.2 + intensity * 0.8;
          return (
            <View key={muscle} style={styles.cell}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: baseColor, opacity },
                ]}
              />
              <Text style={styles.label}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
              {count > 0 && <Text style={styles.count}>{count}</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
  },
  count: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
});
