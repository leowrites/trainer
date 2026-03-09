import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface RestTimerProps {
  seconds: number;
  isRunning: boolean;
  onStop: () => void;
}

export default function RestTimer({ seconds, isRunning, onStop }: RestTimerProps) {
  const theme = useTheme();
  if (!isRunning && seconds === 0) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${String(secs).padStart(2, '0')}`;
  const progress = isRunning ? seconds : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Text style={styles.label}>REST</Text>
      <Text style={styles.timer}>{display}</Text>
      <TouchableOpacity onPress={onStop} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  timer: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  skipBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
