import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  ActivityLog,
  BodyWeightLog,
  StepCountLog,
} from '@core/database/types';
import { useHealthTracking } from '../hooks/use-health-tracking';
import type {
  NewActivityInput,
  NewBodyWeightInput,
  NewStepCountInput,
} from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'weight' | 'steps' | 'activity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split('T')[0] as string;
}

// ─── Body Weight Section ──────────────────────────────────────────────────────

interface BodyWeightSectionProps {
  logs: BodyWeightLog[];
  onCreate: (input: NewBodyWeightInput) => void;
  onDelete: (id: string) => void;
}

function BodyWeightSection({
  logs,
  onCreate,
  onDelete,
}: BodyWeightSectionProps): React.JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [weight, setWeight] = useState('');

  const handleCreate = (): void => {
    const parsed = parseFloat(weight);
    if (!date.trim() || isNaN(parsed) || parsed <= 0) return;
    onCreate({ date: date.trim(), weight_kg: parsed });
    setDate(todayIso());
    setWeight('');
    setShowForm(false);
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white text-lg font-semibold">Body Weight</Text>
        <Pressable
          className="bg-primary-500 px-3 py-1.5 rounded-lg active:opacity-70"
          onPress={() => setShowForm((v) => !v)}
        >
          <Text className="text-white text-sm font-medium">
            {showForm ? 'Cancel' : '+ Log'}
          </Text>
        </Pressable>
      </View>

      {showForm && (
        <View className="bg-surface-card rounded-xl p-4 mb-3 gap-y-3">
          <TextInput
            className="bg-surface-elevated text-white rounded-lg px-3 py-2.5 text-base"
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor="#6b7280"
            value={date}
            onChangeText={setDate}
          />
          <TextInput
            className="bg-surface-elevated text-white rounded-lg px-3 py-2.5 text-base"
            placeholder="Weight (kg)"
            placeholderTextColor="#6b7280"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <Pressable
            className="bg-primary-500 rounded-lg py-3 items-center active:opacity-70"
            onPress={handleCreate}
          >
            <Text className="text-white font-semibold">Save</Text>
          </Pressable>
        </View>
      )}

      {logs.length === 0 ? (
        <Text className="text-white/40 text-sm text-center py-4">
          No weight logs yet
        </Text>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between bg-surface-card rounded-xl px-4 py-3 mb-2">
              <View>
                <Text className="text-white font-medium">{item.date}</Text>
                <Text className="text-primary-400 text-sm">
                  {item.weight_kg} kg
                </Text>
              </View>
              <Pressable
                className="px-3 py-1.5 rounded-lg bg-red-500/20 active:opacity-70"
                onPress={() => onDelete(item.id)}
              >
                <Text className="text-red-400 text-sm">Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ─── Step Count Section ───────────────────────────────────────────────────────

interface StepCountSectionProps {
  logs: StepCountLog[];
  onCreate: (input: NewStepCountInput) => void;
  onDelete: (id: string) => void;
}

function StepCountSection({
  logs,
  onCreate,
  onDelete,
}: StepCountSectionProps): React.JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [steps, setSteps] = useState('');

  const handleCreate = (): void => {
    const parsed = parseInt(steps, 10);
    if (!date.trim() || isNaN(parsed) || parsed < 0) return;
    onCreate({ date: date.trim(), step_count: parsed });
    setDate(todayIso());
    setSteps('');
    setShowForm(false);
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white text-lg font-semibold">Daily Steps</Text>
        <Pressable
          className="bg-primary-500 px-3 py-1.5 rounded-lg active:opacity-70"
          onPress={() => setShowForm((v) => !v)}
        >
          <Text className="text-white text-sm font-medium">
            {showForm ? 'Cancel' : '+ Log'}
          </Text>
        </Pressable>
      </View>

      {showForm && (
        <View className="bg-surface-card rounded-xl p-4 mb-3 gap-y-3">
          <TextInput
            className="bg-surface-elevated text-white rounded-lg px-3 py-2.5 text-base"
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor="#6b7280"
            value={date}
            onChangeText={setDate}
          />
          <TextInput
            className="bg-surface-elevated text-white rounded-lg px-3 py-2.5 text-base"
            placeholder="Step count"
            placeholderTextColor="#6b7280"
            keyboardType="number-pad"
            value={steps}
            onChangeText={setSteps}
          />
          <Pressable
            className="bg-primary-500 rounded-lg py-3 items-center active:opacity-70"
            onPress={handleCreate}
          >
            <Text className="text-white font-semibold">Save</Text>
          </Pressable>
        </View>
      )}

      {logs.length === 0 ? (
        <Text className="text-white/40 text-sm text-center py-4">
          No step logs yet
        </Text>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between bg-surface-card rounded-xl px-4 py-3 mb-2">
              <View>
                <Text className="text-white font-medium">{item.date}</Text>
                <Text className="text-primary-400 text-sm">
                  {item.step_count.toLocaleString()} steps
                </Text>
              </View>
              <Pressable
                className="px-3 py-1.5 rounded-lg bg-red-500/20 active:opacity-70"
                onPress={() => onDelete(item.id)}
              >
                <Text className="text-red-400 text-sm">Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ─── Activity Logs Section ────────────────────────────────────────────────────

interface ActivitySectionProps {
  logs: ActivityLog[];
  onCreate: (input: NewActivityInput) => void;
  onDelete: (id: string) => void;
}

function ActivitySection({
  logs,
  onCreate,
  onDelete,
}: ActivitySectionProps): React.JSX.Element {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [activityType, setActivityType] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = (): void => {
    const parsedDuration = parseInt(duration, 10);
    if (
      !date.trim() ||
      !activityType.trim() ||
      isNaN(parsedDuration) ||
      parsedDuration <= 0
    )
      return;
    onCreate({
      date: date.trim(),
      activity_type: activityType.trim(),
      duration_minutes: parsedDuration,
      notes: notes.trim() || undefined,
    });
    setDate(todayIso());
    setActivityType('');
    setDuration('');
    setNotes('');
    setShowForm(false);
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white text-lg font-semibold">Activities</Text>
        <Pressable
          className="bg-primary-500 px-3 py-1.5 rounded-lg active:opacity-70"
          onPress={() => setShowForm((v) => !v)}
        >
          <Text className="text-white text-sm font-medium">
            {showForm ? 'Cancel' : '+ Log'}
          </Text>
        </Pressable>
      </View>

      {showForm && (
        <View className="bg-surface-card rounded-xl p-4 mb-3 gap-y-3">
          <TextInput
            className="bg-surface-elevated text-white rounded-lg px-3 py-2.5 text-base"
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor="#6b7280"
            value={date}
            onChangeText={setDate}
          />
          <TextInput
            className="bg-surface-elevated text-white rounded-lg px-3 py-2.5 text-base"
            placeholder="Activity type (e.g. Running)"
            placeholderTextColor="#6b7280"
            value={activityType}
            onChangeText={setActivityType}
          />
          <TextInput
            className="bg-surface-elevated text-white rounded-lg px-3 py-2.5 text-base"
            placeholder="Duration (minutes)"
            placeholderTextColor="#6b7280"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
          />
          <TextInput
            className="bg-surface-elevated text-white rounded-lg px-3 py-2.5 text-base"
            placeholder="Notes (optional)"
            placeholderTextColor="#6b7280"
            value={notes}
            onChangeText={setNotes}
          />
          <Pressable
            className="bg-primary-500 rounded-lg py-3 items-center active:opacity-70"
            onPress={handleCreate}
          >
            <Text className="text-white font-semibold">Save</Text>
          </Pressable>
        </View>
      )}

      {logs.length === 0 ? (
        <Text className="text-white/40 text-sm text-center py-4">
          No activity logs yet
        </Text>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between bg-surface-card rounded-xl px-4 py-3 mb-2">
              <View className="flex-1 mr-3">
                <Text className="text-white font-medium">
                  {item.activity_type}
                </Text>
                <Text className="text-primary-400 text-sm">
                  {item.date} · {item.duration_minutes} min
                </Text>
                {item.notes ? (
                  <Text className="text-white/50 text-xs mt-0.5">
                    {item.notes}
                  </Text>
                ) : null}
              </View>
              <Pressable
                className="px-3 py-1.5 rounded-lg bg-red-500/20 active:opacity-70"
                onPress={() => onDelete(item.id)}
              >
                <Text className="text-red-400 text-sm">Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'weight', label: 'Weight' },
  { key: 'steps', label: 'Steps' },
  { key: 'activity', label: 'Activity' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

/**
 * Health tracking screen — logs body weight, step counts, and activities.
 */
export function HealthScreen(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<Section>('weight');
  const {
    bodyWeightLogs,
    createBodyWeightLog,
    deleteBodyWeightLog,
    stepCountLogs,
    createStepCountLog,
    deleteStepCountLog,
    activityLogs,
    createActivityLog,
    deleteActivityLog,
  } = useHealthTracking();

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="pt-14 pb-4 px-4">
        <Text className="text-white text-2xl font-bold">Health</Text>
        <Text className="text-white/50 text-sm mt-0.5">
          Track your body weight, steps, and activities
        </Text>
      </View>

      {/* Section tabs */}
      <View className="flex-row px-4 mb-4 gap-x-2">
        {SECTIONS.map(({ key, label }) => (
          <Pressable
            key={key}
            className={`flex-1 py-2 rounded-lg items-center active:opacity-70 ${
              activeSection === key ? 'bg-primary-500' : 'bg-surface-card'
            }`}
            onPress={() => setActiveSection(key)}
          >
            <Text
              className={`text-sm font-medium ${
                activeSection === key ? 'text-white' : 'text-white/60'
              }`}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {activeSection === 'weight' && (
          <BodyWeightSection
            logs={bodyWeightLogs}
            onCreate={createBodyWeightLog}
            onDelete={deleteBodyWeightLog}
          />
        )}
        {activeSection === 'steps' && (
          <StepCountSection
            logs={stepCountLogs}
            onCreate={createStepCountLog}
            onDelete={deleteStepCountLog}
          />
        )}
        {activeSection === 'activity' && (
          <ActivitySection
            logs={activityLogs}
            onCreate={createActivityLog}
            onDelete={deleteActivityLog}
          />
        )}
      </ScrollView>
    </View>
  );
}
