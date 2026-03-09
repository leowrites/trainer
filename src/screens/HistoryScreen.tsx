import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Card, useTheme, Button } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { format, startOfWeek, isThisWeek } from 'date-fns';
import { getAllWorkouts, getWorkoutById } from '../database/workouts';
import { Workout, WorkoutSet } from '../types';
import { RootStackParamList } from '../navigation/types';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { StackNavigationProp } from '@react-navigation/stack';

type NavProp = StackNavigationProp<RootStackParamList>;
type WorkoutDetailRouteProp = RouteProp<RootStackParamList, 'WorkoutDetail'>;

export default function HistoryScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<WorkoutDetailRouteProp>();
  const workoutId = (route.params as any)?.workoutId as string | undefined;

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [detailWorkout, setDetailWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWorkouts = useCallback(async () => {
    try {
      const list = await getAllWorkouts(100);
      setWorkouts(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  useEffect(() => {
    if (workoutId) {
      getWorkoutById(workoutId).then(setDetailWorkout).catch(console.error);
    }
  }, [workoutId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkouts();
    setRefreshing(false);
  }, [loadWorkouts]);

  // Detail view
  if (workoutId && detailWorkout) {
    const setsByExercise: Record<string, { name: string; sets: WorkoutSet[] }> = {};
    (detailWorkout.sets || []).forEach((s) => {
      if (!setsByExercise[s.exerciseId]) {
        setsByExercise[s.exerciseId] = { name: s.exercise?.name || 'Unknown', sets: [] };
      }
      setsByExercise[s.exerciseId].sets.push(s);
    });

    const totalVolume = (detailWorkout.sets || []).reduce(
      (sum, s) => sum + (s.weight || 0) * (s.reps || 0),
      0
    );

    return (
      <ScrollView style={styles.container}>
        <View style={[styles.detailHeader, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.detailTitle}>{detailWorkout.name}</Text>
          <Text style={styles.detailDate}>
            {format(new Date(detailWorkout.startedAt), 'EEEE, MMMM d, yyyy')}
          </Text>
          <View style={styles.detailStats}>
            {detailWorkout.durationSeconds ? (
              <Text style={styles.detailStat}>
                ⏱ {Math.round(detailWorkout.durationSeconds / 60)} min
              </Text>
            ) : null}
            <Text style={styles.detailStat}>📦 {totalVolume.toFixed(0)} kg vol</Text>
            <Text style={styles.detailStat}>
              🏋️ {(detailWorkout.sets || []).filter((s) => s.completed).length} sets
            </Text>
          </View>
        </View>

        {Object.values(setsByExercise).map(({ name, sets }) => (
          <Card key={name} style={styles.exerciseCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.exerciseTitle}>{name}</Text>
              {sets.map((s, i) => (
                <View key={s.id} style={styles.setRow}>
                  <Text style={styles.setNum}>{s.isWarmup ? 'W' : i + 1}</Text>
                  <Text style={styles.setData}>
                    {s.weight ? `${s.weight}kg` : '-'} × {s.reps || '-'}
                  </Text>
                  {s.completed && <Text style={styles.check}>✓</Text>}
                </View>
              ))}
            </Card.Content>
          </Card>
        ))}

        {Object.keys(setsByExercise).length === 0 && (
          <EmptyState icon="📝" title="No sets logged" message="No sets were recorded for this workout" />
        )}
      </ScrollView>
    );
  }

  if (loading) return <LoadingSpinner />;

  // Group workouts by week
  const groups: { label: string; workouts: Workout[] }[] = [];
  const seen = new Set<string>();

  workouts.forEach((w) => {
    const weekStart = startOfWeek(new Date(w.startedAt), { weekStartsOn: 1 });
    const key = format(weekStart, 'yyyy-MM-dd');
    if (!seen.has(key)) {
      seen.add(key);
      const label = isThisWeek(weekStart, { weekStartsOn: 1 })
        ? 'This Week'
        : `Week of ${format(weekStart, 'MMM d')}`;
      groups.push({ label, workouts: [] });
    }
    groups[groups.length - 1].workouts.push(w);
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {workouts.length === 0 ? (
        <EmptyState icon="📅" title="No workout history" message="Complete your first workout to see it here" />
      ) : (
        groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.workouts.map((w) => {
              const volume = (w.sets || []).reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
              return (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id })}
                >
                  <Card style={styles.workoutCard}>
                    <Card.Content>
                      <View style={styles.workoutCardRow}>
                        <View>
                          <Text style={styles.workoutCardName}>{w.name}</Text>
                          <Text style={styles.workoutCardDate}>
                            {format(new Date(w.startedAt), 'EEE, MMM d · h:mm a')}
                          </Text>
                        </View>
                        <View style={styles.workoutCardStats}>
                          {w.durationSeconds ? (
                            <Text style={styles.workoutStat}>{Math.round(w.durationSeconds / 60)}min</Text>
                          ) : null}
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        ))
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  group: { paddingTop: 16 },
  groupLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#888',
    paddingHorizontal: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workoutCard: { marginHorizontal: 16, marginBottom: 8 },
  workoutCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutCardName: { fontWeight: '600', fontSize: 16 },
  workoutCardDate: { color: '#888', fontSize: 13, marginTop: 2 },
  workoutCardStats: { alignItems: 'flex-end' },
  workoutStat: { color: '#666', fontSize: 13 },
  detailHeader: { padding: 20 },
  detailTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  detailDate: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  detailStats: { flexDirection: 'row', gap: 16, marginTop: 8 },
  detailStat: { color: '#fff', fontSize: 13 },
  exerciseCard: { marginHorizontal: 16, marginTop: 8 },
  exerciseTitle: { fontWeight: 'bold', marginBottom: 6 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  setNum: { width: 24, color: '#888', fontSize: 13 },
  setData: { flex: 1, fontSize: 14 },
  check: { color: '#4caf50', fontWeight: 'bold' },
});
