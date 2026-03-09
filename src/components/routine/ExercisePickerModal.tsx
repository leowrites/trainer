import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Searchbar, Button, useTheme } from 'react-native-paper';
import { Exercise } from '../../types';
import { getAllExercises, searchExercises } from '../../database/exercises';
import { getMuscleColor } from '../../utils/muscleGroups';

interface ExercisePickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (exercise: Exercise) => void;
}

export default function ExercisePickerModal({ visible, onDismiss, onSelect }: ExercisePickerModalProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      const list = query.trim()
        ? await searchExercises(query)
        : await getAllExercises();
      setExercises(list);
    };
    load().catch(console.error);
  }, [visible, query]);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.title}>Select Exercise</Text>
        <Searchbar
          placeholder="Search exercises..."
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => { onSelect(item); setQuery(''); }}
              style={styles.item}
            >
              <View style={[styles.tag, { backgroundColor: getMuscleColor(item.muscleGroup) }]}>
                <Text style={styles.tagText}>{item.muscleGroup}</Text>
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemEquipment}>{item.equipment}</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
        <Button onPress={onDismiss} style={styles.closeBtn}>Cancel</Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  search: {
    marginBottom: 8,
  },
  list: {
    maxHeight: 400,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 10,
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    minWidth: 55,
    textAlign: 'center',
  },
  itemText: {
    flex: 1,
  },
  itemName: {
    fontWeight: '600',
    fontSize: 15,
  },
  itemEquipment: {
    color: '#888',
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  closeBtn: {
    marginTop: 8,
  },
});
