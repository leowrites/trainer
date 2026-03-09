import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme, Checkbox } from 'react-native-paper';
import { WorkoutSet } from '../../types';

interface SetRowProps {
  set: WorkoutSet;
  setIndex: number;
  onRepsChange: (reps: string) => void;
  onWeightChange: (weight: string) => void;
  onComplete: () => void;
  onRemove: () => void;
}

export default function SetRow({ set, setIndex, onRepsChange, onWeightChange, onComplete, onRemove }: SetRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, set.completed && { backgroundColor: '#e8f5e9' }]}>
      <Text style={styles.setNum}>{set.isWarmup ? 'W' : setIndex + 1}</Text>
      <TextInput
        style={styles.input}
        value={set.weight !== undefined ? String(set.weight) : ''}
        onChangeText={onWeightChange}
        keyboardType="decimal-pad"
        placeholder="kg"
        editable={!set.completed}
      />
      <TextInput
        style={styles.input}
        value={set.reps !== undefined ? String(set.reps) : ''}
        onChangeText={onRepsChange}
        keyboardType="number-pad"
        placeholder="reps"
        editable={!set.completed}
      />
      <TouchableOpacity
        onPress={set.completed ? undefined : onComplete}
        style={[styles.completeBtn, { backgroundColor: set.completed ? '#4caf50' : theme.colors.primary }]}
      >
        <Text style={styles.completeBtnText}>{set.completed ? '✓' : 'Done'}</Text>
      </TouchableOpacity>
      {!set.completed && (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
    backgroundColor: '#f5f5f5',
  },
  setNum: {
    width: 28,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#555',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginHorizontal: 4,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  completeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 4,
  },
  completeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeBtnText: {
    color: '#f44336',
    fontWeight: 'bold',
  },
});
