import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Searchbar, Card, useTheme, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { getAllExercises, searchExercises } from '../database/exercises';
import { getSetsByExercise } from '../database/workouts';
import { Exercise, WorkoutSet } from '../types';
import { RootStackParamList } from '../navigation/types';
import SimpleLineChart from '../components/progress/SimpleLineChart';
import EmptyState from '../components/common/EmptyState';

type NavProp = StackNavigationProp<RootStackParamList>;
type ExerciseProgressRouteProp = RouteProp<RootStackParamList, 'ExerciseProgress'>;

export default function ProgressScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ExerciseProgressRouteProp>();
  const preselectedId = (route.params as any)?.exerciseId as string | undefined;

  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [showSearch, setShowSearch] = useState(!preselectedId);

  useEffect(() => {
    getAllExercises().then(setExercises).catch(console.error);
  }, []);

  useEffect(() => {
    if (preselectedId && exercises.length > 0) {
      const ex = exercises.find((e) => e.id === preselectedId);
      if (ex) selectExercise(ex);
    }
  }, [preselectedId, exercises]);

  useEffect(() => {
    if (!query.trim()) {
      getAllExercises().then(setExercises).catch(console.error);
    } else {
      searchExercises(query).then(setExercises).catch(console.error);
    }
  }, [query]);

  const selectExercise = useCallback(async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowSearch(false);
    try {
      const history = await getSetsByExercise(exercise.id, 50);
      setSets(history);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Compute stats
  const completedSets = sets.filter((s) => s.completed && !s.isWarmup);
  const weightData = completedSets
    .slice()
    .reverse()
    .map((s, i) => ({
      label: format(new Date(s.completedAt || 0), 'MM/dd'),
      value: s.weight || 0,
    }))
    .filter((d) => d.value > 0)
    .slice(-20);

  const maxWeight = completedSets.reduce((max, s) => Math.max(max, s.weight || 0), 0);
  const maxReps = completedSets.reduce((max, s) => Math.max(max, s.reps || 0), 0);
  const totalVolume = completedSets.reduce(
    (sum, s) => sum + (s.weight || 0) * (s.reps || 0),
    0
  );

  if (showSearch || !selectedExercise) {
    return (
      <View style={styles.container}>
        <Searchbar
          placeholder="Search exercises..."
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
        <ScrollView>
          {exercises.map((ex) => (
            <TouchableOpacity
              key={ex.id}
              onPress={() => selectExercise(ex)}
              style={styles.exerciseItem}
            >
              <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
              <View>
                <Text style={styles.exerciseItemName}>{ex.name}</Text>
                <Text style={styles.exerciseItemMuscle}>{ex.muscleGroup} · {ex.equipment}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {exercises.length === 0 && (
            <EmptyState icon="🔍" title="No exercises found" />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.exHeader, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.exTitle}>{selectedExercise.name}</Text>
        <Text style={styles.exSub}>{selectedExercise.muscleGroup} · {selectedExercise.equipment}</Text>
        <TouchableOpacity onPress={() => setShowSearch(true)} style={styles.changeBtn}>
          <Text style={styles.changeBtnText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Personal Records */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{maxWeight > 0 ? `${maxWeight}kg` : '-'}</Text>
          <Text style={styles.statLbl}>Max Weight</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{maxReps || '-'}</Text>
          <Text style={styles.statLbl}>Max Reps</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{totalVolume > 0 ? `${totalVolume.toFixed(0)}` : '-'}</Text>
          <Text style={styles.statLbl}>Total Vol (kg)</Text>
        </View>
      </View>

      {/* Weight progression chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.cardTitle}>Weight Progression</Text>
          {weightData.length > 0 ? (
            <SimpleLineChart
              data={weightData}
              height={130}
              color={theme.colors.primary}
              unit="kg"
            />
          ) : (
            <EmptyState icon="📊" title="No data yet" message="Complete sets to track progress" />
          )}
        </Card.Content>
      </Card>

      {/* Recent sets */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.cardTitle}>Recent Sets</Text>
          {completedSets.length === 0 ? (
            <Text style={styles.empty}>No sets logged yet</Text>
          ) : (
            completedSets.slice(0, 20).map((s) => (
              <View key={s.id} style={styles.setRow}>
                <Text style={styles.setDate}>
                  {format(new Date(s.completedAt || 0), 'MMM d')}
                </Text>
                <Text style={styles.setData}>
                  {s.weight ? `${s.weight}kg` : '-'} × {s.reps || '-'} reps
                </Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  search: { margin: 16 },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  exerciseItemName: { fontWeight: '600', fontSize: 15 },
  exerciseItemMuscle: { color: '#888', fontSize: 12, marginTop: 1 },
  exHeader: { padding: 20, paddingBottom: 24 },
  exTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  exSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  changeBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  changeBtnText: { color: '#fff', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statLbl: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },
  card: { marginHorizontal: 16, marginBottom: 12 },
  cardTitle: { fontWeight: 'bold', marginBottom: 10 },
  empty: { color: '#aaa', textAlign: 'center', paddingVertical: 16 },
  setRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  setDate: { width: 60, color: '#888', fontSize: 13 },
  setData: { flex: 1, fontSize: 14 },
});
