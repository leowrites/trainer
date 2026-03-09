import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Button, Card, FAB, Portal, Modal, TextInput, useTheme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchSchedulesThunk,
  createScheduleThunk,
  deleteScheduleThunk,
  setActiveScheduleThunk,
  addDayToScheduleThunk,
  removeDayFromScheduleThunk,
  advanceScheduleThunk,
} from '../store/scheduleSlice';
import { useRoutines } from '../hooks/useRoutines';
import { Schedule, ScheduleDay } from '../types';
import EmptyState from '../components/common/EmptyState';
import ExercisePickerModal from '../components/routine/ExercisePickerModal';
import { Routine, Exercise } from '../types';
import { getAllRoutines } from '../database/routines';
import { getMuscleColor } from '../utils/muscleGroups';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type NavProp = StackNavigationProp<RootStackParamList>;

export default function ScheduleScreen() {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavProp>();
  const { schedules, activeSchedule, isLoading } = useSelector((s: RootState) => s.schedules);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [routinePickerVisible, setRoutinePickerVisible] = useState(false);
  const [availableRoutines, setAvailableRoutines] = useState<Routine[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await dispatch(fetchSchedulesThunk());
    const routines = await getAllRoutines();
    setAvailableRoutines(routines);
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleCreate = async () => {
    if (!scheduleName.trim()) return;
    await dispatch(createScheduleThunk(scheduleName));
    setScheduleName('');
    setCreateModalVisible(false);
  };

  const handleDelete = (schedule: Schedule) => {
    Alert.alert('Delete Schedule', `Delete "${schedule.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteScheduleThunk(schedule.id)) },
    ]);
  };

  const handleSetActive = (scheduleId: string) => {
    dispatch(setActiveScheduleThunk(scheduleId));
  };

  const handleAddRoutine = async (routine: Routine) => {
    if (!selectedSchedule) return;
    const currentDays = selectedSchedule.days || [];
    await dispatch(addDayToScheduleThunk({
      scheduleId: selectedSchedule.id,
      routineId: routine.id,
      orderIndex: currentDays.length,
    }));
    setRoutinePickerVisible(false);
    await load();
    // Refresh selected schedule
    const updated = schedules.find((s) => s.id === selectedSchedule.id);
    if (updated) setSelectedSchedule(updated);
  };

  const handleRemoveDay = async (dayId: string, scheduleId: string) => {
    await dispatch(removeDayFromScheduleThunk({ dayId, scheduleId }));
    await load();
  };

  const handleAdvance = async (scheduleId: string) => {
    await dispatch(advanceScheduleThunk(scheduleId));
  };

  const getNextRoutine = (schedule: Schedule): Routine | undefined => {
    const days = schedule.days || [];
    if (days.length === 0) return undefined;
    return days[schedule.currentIndex % days.length]?.routine;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Active schedule highlight */}
      {activeSchedule && (
        <View style={[styles.activeCard, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.activeLabel}>ACTIVE SCHEDULE</Text>
          <Text style={styles.activeName}>{activeSchedule.name}</Text>
          {getNextRoutine(activeSchedule) && (
            <Text style={styles.nextRoutine}>
              Next: {getNextRoutine(activeSchedule)?.name}
            </Text>
          )}
          <View style={styles.activeActions}>
            <Button
              mode="contained-tonal"
              style={styles.activeBtn}
              onPress={() => {
                const next = getNextRoutine(activeSchedule);
                if (next) navigation.navigate('WorkoutMode', { routineId: next.id });
              }}
            >
              Start Next
            </Button>
            <Button
              mode="outlined"
              style={styles.activeBtn}
              onPress={() => handleAdvance(activeSchedule.id)}
              labelStyle={styles.whiteBtnLabel}
            >
              Skip Day
            </Button>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>My Schedules</Text>

      {schedules.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="No schedules yet"
          message="Create a training schedule to organize your week"
        />
      ) : (
        schedules.map((schedule) => (
          <Card key={schedule.id} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.scheduleName}>{schedule.name}</Text>
                  <Text style={styles.scheduleDays}>{(schedule.days || []).length} days</Text>
                </View>
                <View style={styles.cardActions}>
                  {!schedule.isActive && (
                    <Button
                      compact
                      mode="outlined"
                      onPress={() => handleSetActive(schedule.id)}
                    >
                      Activate
                    </Button>
                  )}
                  {schedule.isActive && (
                    <Text style={[styles.activeTag, { color: theme.colors.primary }]}>● Active</Text>
                  )}
                </View>
              </View>

              {/* Days list */}
              <View style={styles.daysList}>
                {(schedule.days || []).map((day, i) => (
                  <View key={day.id} style={[styles.dayRow, schedule.currentIndex % (schedule.days?.length || 1) === i && styles.dayRowActive]}>
                    <Text style={styles.dayNum}>Day {i + 1}</Text>
                    <Text style={styles.dayRoutineName}>{day.routine?.name || 'Unknown'}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveDay(day.id, schedule.id)}
                    >
                      <Text style={styles.removeDayText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <Button
                  compact
                  onPress={() => { setSelectedSchedule(schedule); setRoutinePickerVisible(true); }}
                >
                  + Add Routine
                </Button>
                <Button compact onPress={() => handleDelete(schedule)} textColor="#f44336">
                  Delete
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setCreateModalVisible(true)}
        color="#fff"
      />

      {/* Routine picker as a simple list modal */}
      <Portal>
        <Modal
          visible={routinePickerVisible}
          onDismiss={() => setRoutinePickerVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Add Routine to Schedule</Text>
          <ScrollView style={styles.routineList}>
            {availableRoutines.map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => handleAddRoutine(r)}
                style={styles.routineItem}
              >
                <Text style={styles.routineItemName}>{r.name}</Text>
                <Text style={styles.routineItemCount}>
                  {(r.exercises || []).length} exercises
                </Text>
              </TouchableOpacity>
            ))}
            {availableRoutines.length === 0 && (
              <Text style={styles.noRoutines}>No routines yet. Create one first!</Text>
            )}
          </ScrollView>
          <Button onPress={() => setRoutinePickerVisible(false)}>Cancel</Button>
        </Modal>

        <Modal
          visible={createModalVisible}
          onDismiss={() => setCreateModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>New Schedule</Text>
          <TextInput
            label="Schedule Name"
            value={scheduleName}
            onChangeText={setScheduleName}
            mode="outlined"
            style={styles.input}
          />
          <View style={styles.modalBtns}>
            <Button onPress={() => setCreateModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleCreate} disabled={!scheduleName.trim()}>
              Create
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  activeCard: { padding: 20, marginBottom: 8 },
  activeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  activeName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  nextRoutine: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  activeActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  activeBtn: { flex: 1 },
  whiteBtnLabel: { color: '#fff' },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: { marginHorizontal: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  scheduleName: { fontWeight: 'bold', fontSize: 16 },
  scheduleDays: { color: '#888', fontSize: 13 },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  activeTag: { fontWeight: 'bold', fontSize: 13 },
  daysList: { marginBottom: 8 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  dayRowActive: { backgroundColor: '#e8f5e9' },
  dayNum: { width: 50, color: '#888', fontSize: 13 },
  dayRoutineName: { flex: 1, fontSize: 14 },
  removeDayText: { color: '#f44336', paddingHorizontal: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  fab: { position: 'absolute', right: 16, bottom: 24 },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: { fontWeight: 'bold', marginBottom: 16 },
  routineList: { maxHeight: 300, marginBottom: 8 },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  routineItemName: { fontWeight: '600', fontSize: 15 },
  routineItemCount: { color: '#888', fontSize: 13 },
  noRoutines: { color: '#aaa', textAlign: 'center', paddingVertical: 20 },
  input: { marginBottom: 12 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
