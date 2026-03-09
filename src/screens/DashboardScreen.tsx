import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format, startOfWeek, addDays } from 'date-fns';
import { getWorkoutsThisWeek, getAllWorkouts } from '../database/workouts';
import { Workout } from '../types';
import { RootStackParamList } from '../navigation/types';
import SimpleBarChart from '../components/progress/SimpleBarChart';
import MuscleHeatmap from '../components/progress/MuscleHeatmap';

type NavProp = StackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavProp>();
  const [weekWorkouts, setWeekWorkouts] = useState<Workout[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    try {
      const [week, recent] = await Promise.all([
        getWorkoutsThisWeek(),
        getAllWorkouts(5),
      ]);
      setWeekWorkouts(week);
      setRecentWorkouts(recent);
      setStreak(computeStreak(recent));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Build 7-day bar chart data (Mon-Sun)
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    const label = format(d, 'EEE');
    const dayStr = format(d, 'yyyy-MM-dd');
    const count = weekWorkouts.filter(
      (w) => format(new Date(w.startedAt), 'yyyy-MM-dd') === dayStr
    ).length;
    return { label, value: count };
  });

  // Total workout hours this week
  const totalSeconds = weekWorkouts.reduce((s, w) => s + (w.durationSeconds || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  // Muscle group counts
  const muscleCounts: Record<string, number> = {};
  weekWorkouts.forEach((w) => {
    (w.sets || []).forEach((s) => {
      if (s.exercise?.muscleGroup) {
        muscleCounts[s.exercise.muscleGroup] = (muscleCounts[s.exercise.muscleGroup] || 0) + 1;
      }
    });
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header stats */}
      <View style={[styles.statsRow, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{weekWorkouts.length}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalHours}h</Text>
          <Text style={styles.statLabel}>Training Time</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streak}🔥</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* Start workout button */}
      <View style={styles.section}>
        <Button
          mode="contained"
          icon="play"
          onPress={() => navigation.navigate('WorkoutMode', {})}
          style={styles.startBtn}
          contentStyle={styles.startBtnContent}
          labelStyle={styles.startBtnLabel}
        >
          Start Workout
        </Button>
      </View>

      {/* Weekly volume chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>This Week</Text>
          <SimpleBarChart data={weekDays} height={100} color={theme.colors.primary} />
        </Card.Content>
      </Card>

      {/* Muscle groups */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>Muscles Worked This Week</Text>
          <MuscleHeatmap muscleCounts={muscleCounts} />
        </Card.Content>
      </Card>

      {/* Recent workouts */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>Recent Workouts</Text>
          {recentWorkouts.length === 0 ? (
            <Text style={styles.emptyText}>No workouts yet. Start your first one!</Text>
          ) : (
            recentWorkouts.map((w) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => navigation.navigate('WorkoutDetail', { workoutId: w.id })}
                style={styles.workoutRow}
              >
                <View>
                  <Text style={styles.workoutName}>{w.name}</Text>
                  <Text style={styles.workoutDate}>
                    {format(new Date(w.startedAt), 'EEE, MMM d')}
                    {w.durationSeconds ? ` · ${Math.round(w.durationSeconds / 60)}min` : ''}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

function computeStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;
  const sorted = [...workouts].sort((a, b) => b.startedAt - a.startedAt);
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  const uniqueDays = Array.from(
    new Set(sorted.map((w) => format(new Date(w.startedAt), 'yyyy-MM-dd')))
  );

  for (const day of uniqueDays) {
    const expected = format(checkDate, 'yyyy-MM-dd');
    if (day === expected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  section: { padding: 16 },
  startBtn: { borderRadius: 12 },
  startBtnContent: { height: 52 },
  startBtnLabel: { fontSize: 16, fontWeight: 'bold' },
  card: { marginHorizontal: 16, marginBottom: 12 },
  cardTitle: { fontWeight: 'bold', marginBottom: 10 },
  emptyText: { color: '#aaa', textAlign: 'center', paddingVertical: 12 },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workoutName: { fontWeight: '600', fontSize: 15 },
  workoutDate: { color: '#888', fontSize: 13 },
  chevron: { color: '#ccc', fontSize: 24 },
});
