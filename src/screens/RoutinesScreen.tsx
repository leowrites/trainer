import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  FAB,
  Button,
  TextInput,
  Portal,
  Modal,
  useTheme,
  Divider,
} from 'react-native-paper';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoutines } from '../hooks/useRoutines';
import RoutineCard from '../components/routine/RoutineCard';
import ExercisePickerModal from '../components/routine/ExercisePickerModal';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { RootStackParamList } from '../navigation/types';
import { Routine, Exercise, RoutineExercise } from '../types';
import { getMuscleColor } from '../utils/muscleGroups';

type NavProp = StackNavigationProp<RootStackParamList>;
type RoutineDetailRouteProp = RouteProp<RootStackParamList, 'RoutineDetail'>;

export default function RoutinesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutineDetailRouteProp>();
  const routineId = (route.params as any)?.routineId as string | undefined;

  const { routines, selectedRoutine, isLoading, loadRoutine, createNew, update, remove, addExercise, removeExercise } = useRoutines();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editRoutine, setEditRoutine] = useState<Routine | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [routineDesc, setRoutineDesc] = useState('');
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [detailRoutine, setDetailRoutine] = useState<Routine | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (routineId) {
        loadRoutine(routineId).then((result) => {
          const r = result.payload as Routine;
          setDetailRoutine(r);
        });
      }
    }, [routineId])
  );

  const openCreateModal = () => {
    setEditRoutine(null);
    setRoutineName('');
    setRoutineDesc('');
    setCreateModalVisible(true);
  };

  const openEditModal = (routine: Routine) => {
    setEditRoutine(routine);
    setRoutineName(routine.name);
    setRoutineDesc(routine.description);
    setCreateModalVisible(true);
  };

  const handleSave = async () => {
    if (!routineName.trim()) return;
    if (editRoutine) {
      await update(editRoutine.id, { name: routineName, description: routineDesc });
    } else {
      await createNew(routineName, routineDesc);
    }
    setCreateModalVisible(false);
  };

  const handleDelete = (routine: Routine) => {
    Alert.alert('Delete Routine', `Delete "${routine.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(routine.id) },
    ]);
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (!detailRoutine) return;
    const existing = detailRoutine.exercises || [];
    await addExercise({
      routineId: detailRoutine.id,
      exerciseId: exercise.id,
      orderIndex: existing.length,
      targetSets: 3,
      targetReps: '8-12',
      targetWeight: 0,
      restSeconds: 90,
      notes: '',
    });
    const updated = await loadRoutine(detailRoutine.id);
    setDetailRoutine(updated.payload as Routine);
    setExercisePickerVisible(false);
  };

  // If we're in detail mode (navigated to RoutineDetail)
  if (routineId && detailRoutine) {
    return (
      <View style={styles.container}>
        <View style={[styles.detailHeader, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.detailTitle}>{detailRoutine.name}</Text>
          {detailRoutine.description ? (
            <Text style={styles.detailDesc}>{detailRoutine.description}</Text>
          ) : null}
        </View>
        <ScrollView style={styles.flex}>
          {(detailRoutine.exercises || []).length === 0 ? (
            <EmptyState icon="🏋️" title="No exercises yet" message="Add exercises to this routine" />
          ) : (
            (detailRoutine.exercises || []).map((rex) => (
              <View key={rex.id} style={styles.exerciseRow}>
                <View style={[styles.muscleDot, { backgroundColor: getMuscleColor(rex.exercise?.muscleGroup || '') }]} />
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{rex.exercise?.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {rex.targetSets} sets · {rex.targetReps} reps · {rex.restSeconds}s rest
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert('Remove', `Remove ${rex.exercise?.name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeExercise(rex.id, detailRoutine.id).then(() => loadRoutine(detailRoutine.id).then((r) => setDetailRoutine(r.payload as Routine))) },
                  ])}
                >
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
        <Button
          mode="contained"
          onPress={() => setExercisePickerVisible(true)}
          style={styles.addExerciseBtn}
        >
          + Add Exercise
        </Button>
        <ExercisePickerModal
          visible={exercisePickerVisible}
          onDismiss={() => setExercisePickerVisible(false)}
          onSelect={handleAddExercise}
        />
      </View>
    );
  }

  if (isLoading && routines.length === 0) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onPress={() => openEditModal(item)}
            onLongPress={() => handleDelete(item)}
            onStartWorkout={() => navigation.navigate('WorkoutMode', { routineId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="No routines yet"
            message="Create your first workout routine"
          />
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreateModal}
        color="#fff"
      />

      <Portal>
        <Modal
          visible={createModalVisible}
          onDismiss={() => setCreateModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editRoutine ? 'Edit Routine' : 'New Routine'}
          </Text>
          <TextInput
            label="Routine Name"
            value={routineName}
            onChangeText={setRoutineName}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Description (optional)"
            value={routineDesc}
            onChangeText={setRoutineDesc}
            mode="outlined"
            style={styles.input}
            multiline
          />
          <View style={styles.modalBtns}>
            <Button onPress={() => setCreateModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} disabled={!routineName.trim()}>
              {editRoutine ? 'Save' : 'Create'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  flex: { flex: 1 },
  list: { paddingTop: 12, paddingBottom: 100 },
  fab: { position: 'absolute', right: 16, bottom: 24 },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontWeight: 'bold', marginBottom: 16 },
  input: { marginBottom: 12 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  detailHeader: {
    padding: 20,
  },
  detailTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  detailDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  muscleDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontWeight: '600', fontSize: 15 },
  exerciseMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  removeText: { color: '#f44336', fontSize: 18, paddingHorizontal: 8 },
  addExerciseBtn: { margin: 16 },
});
