import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { WorkoutSet, Exercise } from '../../types';
import { getMuscleColor } from '../../utils/muscleGroups';
import SetRow from './SetRow';

interface ExerciseCardProps {
  exercise: Exercise;
  sets: WorkoutSet[];
  suggestion?: string;
  onAddSet: () => void;
  onRepsChange: (setId: string, reps: string) => void;
  onWeightChange: (setId: string, weight: string) => void;
  onCompleteSet: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
}

export default function ExerciseCard({
  exercise,
  sets,
  suggestion,
  onAddSet,
  onRepsChange,
  onWeightChange,
  onCompleteSet,
  onRemoveSet,
}: ExerciseCardProps) {
  const theme = useTheme();
  const muscleColor = getMuscleColor(exercise.muscleGroup);
  const completedCount = sets.filter((s) => s.completed && !s.isWarmup).length;
  const totalCount = sets.filter((s) => !s.isWarmup).length;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={[styles.muscleTag, { backgroundColor: muscleColor }]}>
            <Text style={styles.muscleTagText}>{exercise.muscleGroup}</Text>
          </View>
          <Text variant="titleMedium" style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.setCount}>{completedCount}/{totalCount}</Text>
        </View>

        {suggestion ? (
          <View style={styles.suggestion}>
            <Text style={styles.suggestionText}>💡 {suggestion}</Text>
          </View>
        ) : null}

        <View style={styles.setHeader}>
          <Text style={[styles.setHeaderText, { width: 28 }]}>#</Text>
          <Text style={[styles.setHeaderText, { flex: 1, textAlign: 'center' }]}>Weight</Text>
          <Text style={[styles.setHeaderText, { flex: 1, textAlign: 'center' }]}>Reps</Text>
          <Text style={[styles.setHeaderText, { width: 60 }]}> </Text>
        </View>

        {sets.map((s, i) => (
          <SetRow
            key={s.id}
            set={s}
            setIndex={i}
            onRepsChange={(reps) => onRepsChange(s.id, reps)}
            onWeightChange={(weight) => onWeightChange(s.id, weight)}
            onComplete={() => onCompleteSet(s.id)}
            onRemove={() => onRemoveSet(s.id)}
          />
        ))}

        <Button mode="outlined" onPress={onAddSet} style={styles.addSetBtn} compact>
          + Add Set
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  muscleTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  muscleTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  exerciseName: {
    flex: 1,
    fontWeight: 'bold',
  },
  setCount: {
    color: '#666',
    fontSize: 13,
  },
  suggestion: {
    backgroundColor: '#fff8e1',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  suggestionText: {
    color: '#f57f17',
    fontSize: 13,
  },
  setHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  setHeaderText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  addSetBtn: {
    marginTop: 8,
  },
});
