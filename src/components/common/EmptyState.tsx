import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export default function EmptyState({ icon = '📭', title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text variant="titleMedium" style={styles.title}>{title}</Text>
      {message ? <Text variant="bodyMedium" style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  message: {
    textAlign: 'center',
    color: '#666',
  },
});
