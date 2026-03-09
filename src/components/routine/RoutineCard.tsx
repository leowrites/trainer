import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { Routine } from '../../types';
import { getMuscleColor } from '../../utils/muscleGroups';

interface RoutineCardProps {
  routine: Routine;
  onPress: () => void;
  onLongPress?: () => void;
  onStartWorkout?: () => void;
}

export default function RoutineCard({ routine, onPress, onLongPress, onStartWorkout }: RoutineCardProps) {
  const theme = useTheme();
  const exercises = routine.exercises || [];
  const muscleGroups = Array.from(new Set(
    exercises.map((e) => e.exercise?.muscleGroup).filter(Boolean) as string[]
  )).slice(0, 5);

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text variant="titleMedium" style={styles.title}>{routine.name}</Text>
              <Text style={styles.exerciseCount}>{exercises.length} exercises</Text>
            </View>
            {routine.description ? (
              <Text style={styles.description} numberOfLines={1}>{routine.description}</Text>
            ) : null}
          </View>

          <View style={styles.muscleTags}>
            {muscleGroups.map((mg) => (
              <View key={mg} style={[styles.tag, { backgroundColor: getMuscleColor(mg) }]}>
                <Text style={styles.tagText}>{mg}</Text>
              </View>
            ))}
            {muscleGroups.length === 0 && (
              <Text style={styles.noMuscles}>No exercises yet</Text>
            )}
          </View>

          {onStartWorkout && (
            <TouchableOpacity
              onPress={onStartWorkout}
              style={[styles.startBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.startBtnText}>▶ Start</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  header: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  exerciseCount: {
    color: '#666',
    fontSize: 13,
  },
  description: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  noMuscles: {
    color: '#ccc',
    fontSize: 12,
  },
  startBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
