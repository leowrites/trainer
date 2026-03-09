import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  Portal,
  Modal,
  SegmentedButtons,
} from 'react-native-paper';
import { format } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import {
  fetchHealthLogsThunk,
  logHealthDataThunk,
  fetchLatestBodyweightThunk,
  deleteHealthLogThunk,
} from '../store/healthSlice';
import { HealthLog } from '../types';
import SimpleLineChart from '../components/progress/SimpleLineChart';
import EmptyState from '../components/common/EmptyState';

export default function HealthScreen() {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { logs, latestBodyweight, isLoading } = useSelector((s: RootState) => s.health);

  const [logType, setLogType] = useState<HealthLog['type']>('bodyweight');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await Promise.all([
      dispatch(fetchHealthLogsThunk()),
      dispatch(fetchLatestBodyweightThunk()),
    ]);
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleLog = async () => {
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) {
      Alert.alert('Invalid value', 'Please enter a valid number');
      return;
    }
    const units: Record<HealthLog['type'], string> = {
      bodyweight: 'kg',
      steps: 'steps',
      activity: 'min',
    };
    await dispatch(
      logHealthDataThunk({
        date: format(new Date(), 'yyyy-MM-dd'),
        type: logType,
        value: numVal,
        unit: units[logType],
        notes,
      })
    );
    setValue('');
    setNotes('');
    setModalVisible(false);
    load();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Delete this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteHealthLogThunk(id)) },
    ]);
  };

  // Build bodyweight chart data
  const bwLogs = logs.filter((l) => l.type === 'bodyweight').slice(0, 30).reverse();
  const bwChartData = bwLogs.map((l) => ({
    label: format(new Date(l.date), 'MM/dd'),
    value: l.value,
  }));

  const typeLabels: Record<HealthLog['type'], string> = {
    bodyweight: '⚖️',
    steps: '👟',
    activity: '🏃',
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Stats banner */}
      <View style={[styles.banner, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.bannerStat}>
          <Text style={styles.bannerVal}>
            {latestBodyweight ? `${latestBodyweight.value}kg` : '-'}
          </Text>
          <Text style={styles.bannerLbl}>Current Weight</Text>
        </View>
        <Button
          mode="contained-tonal"
          onPress={() => setModalVisible(true)}
          style={styles.logBtn}
        >
          + Log Data
        </Button>
      </View>

      {/* Bodyweight chart */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.cardTitle}>Body Weight Trend</Text>
          {bwChartData.length > 0 ? (
            <SimpleLineChart data={bwChartData} height={130} color={theme.colors.primary} unit="kg" />
          ) : (
            <EmptyState icon="⚖️" title="No weight data" message="Start logging your body weight" />
          )}
        </Card.Content>
      </Card>

      {/* Recent logs */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.cardTitle}>Recent Logs</Text>
          {logs.length === 0 ? (
            <Text style={styles.empty}>No health data logged yet</Text>
          ) : (
            logs.slice(0, 30).map((log) => (
              <TouchableOpacity
                key={log.id}
                onLongPress={() => handleDelete(log.id)}
                style={styles.logRow}
              >
                <Text style={styles.logIcon}>{typeLabels[log.type]}</Text>
                <View style={styles.logInfo}>
                  <Text style={styles.logValue}>{log.value} {log.unit}</Text>
                  <Text style={styles.logDate}>
                    {format(new Date(log.date), 'EEE, MMM d')}
                    {log.notes ? ` · ${log.notes}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Log Health Data</Text>

          <SegmentedButtons
            value={logType}
            onValueChange={(v) => setLogType(v as HealthLog['type'])}
            buttons={[
              { value: 'bodyweight', label: 'Weight' },
              { value: 'steps', label: 'Steps' },
              { value: 'activity', label: 'Activity' },
            ]}
            style={styles.segment}
          />

          <TextInput
            label={logType === 'bodyweight' ? 'Weight (kg)' : logType === 'steps' ? 'Steps' : 'Duration (min)'}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.modalBtns}>
            <Button onPress={() => setModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleLog} disabled={!value.trim()}>
              Log
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  bannerStat: {},
  bannerVal: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  bannerLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  logBtn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  card: { marginHorizontal: 16, marginTop: 12 },
  cardTitle: { fontWeight: 'bold', marginBottom: 10 },
  empty: { color: '#aaa', textAlign: 'center', paddingVertical: 16 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  logIcon: { fontSize: 22, marginRight: 12 },
  logInfo: { flex: 1 },
  logValue: { fontWeight: '600', fontSize: 15 },
  logDate: { color: '#888', fontSize: 12, marginTop: 1 },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontWeight: 'bold', marginBottom: 16 },
  segment: { marginBottom: 16 },
  input: { marginBottom: 12 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
