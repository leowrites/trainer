import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSchedules } from '../hooks/use-schedules';
import { useRoutines } from '@features/routines';
import type { Schedule } from '@core/database/types';

// ─── Schedule row ──────────────────────────────────────────────────────────────

function ScheduleRow({
  item,
  onActivate,
  onDelete,
}: {
  item: Schedule;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}): React.JSX.Element {
  return (
    <View className="bg-surface-elevated px-4 py-3 rounded-lg mb-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-white font-medium">{item.name}</Text>
          {item.is_active ? (
            <Text className="text-primary-400 text-xs mt-0.5">● Active</Text>
          ) : (
            <Text className="text-white/40 text-xs mt-0.5">Inactive</Text>
          )}
        </View>
        <View className="flex-row gap-3">
          {!item.is_active && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Set ${item.name} as active`}
              onPress={() => onActivate(item.id)}
              hitSlop={8}
            >
              <Text className="text-primary-400 text-sm">Set Active</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
            onPress={() => onDelete(item.id)}
            hitSlop={8}
          >
            <Text className="text-red-400 text-sm">Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export function ScheduleScreen(): React.JSX.Element {
  const { schedules, createSchedule, setActiveSchedule, deleteSchedule } =
    useSchedules();
  const { routines } = useRoutines();

  const [showForm, setShowForm] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [orderedRoutineIds, setOrderedRoutineIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleRoutine = (id: string): void => {
    setOrderedRoutineIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreate = (): void => {
    const trimmedName = scheduleName.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      createSchedule({
        name: trimmedName,
        routineIds: orderedRoutineIds,
      });
      setScheduleName('');
      setOrderedRoutineIds([]);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="pt-14 pb-4 px-4">
        <Text className="text-white text-2xl font-bold">Schedules</Text>
        <Text className="text-white/50 text-sm mt-1">
          Arrange routines into a rotating schedule (A → B → C → A)
        </Text>
      </View>

      <View className="flex-1 px-4">
        <FlatList
          data={schedules}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ScheduleRow
              item={item}
              onActivate={(id) => setActiveSchedule(id)}
              onDelete={(id) => deleteSchedule(id)}
            />
          )}
          ListEmptyComponent={
            <Text className="text-white/40 text-center mt-8">
              No schedules yet. Create one below.
            </Text>
          }
          ListFooterComponent={
            showForm ? (
              <View className="mt-4 bg-surface-elevated rounded-lg p-4">
                <Text className="text-white font-semibold mb-3">
                  New Schedule
                </Text>
                <TextInput
                  className="bg-surface text-white rounded-md px-3 py-2 mb-4"
                  placeholder="Schedule name (e.g. Push/Pull Split)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={scheduleName}
                  onChangeText={setScheduleName}
                  autoCapitalize="words"
                />
                <Text className="text-white/60 text-xs uppercase tracking-wider mb-2">
                  Select Routines (in rotation order)
                </Text>
                {routines.length === 0 ? (
                  <Text className="text-white/40 text-sm mb-4">
                    No routines available — create some in the Routines screen.
                  </Text>
                ) : (
                  routines.map((routine) => {
                    const idx = orderedRoutineIds.indexOf(routine.id);
                    const selected = idx !== -1;
                    return (
                      <Pressable
                        key={routine.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        className="flex-row items-center py-2"
                        onPress={() => toggleRoutine(routine.id)}
                      >
                        <View
                          className={`w-5 h-5 rounded mr-3 border items-center justify-center ${
                            selected
                              ? 'bg-primary-500 border-primary-500'
                              : 'border-white/30'
                          }`}
                        >
                          {selected ? (
                            <Text className="text-white text-xs font-bold">
                              {idx + 1}
                            </Text>
                          ) : null}
                        </View>
                        <Text className="text-white">{routine.name}</Text>
                      </Pressable>
                    );
                  })
                )}
                <View className="flex-row gap-2 mt-4">
                  <Pressable
                    accessibilityRole="button"
                    className="flex-1 bg-primary-600 rounded-md py-2 items-center"
                    onPress={handleCreate}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold">Save</Text>
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    className="flex-1 bg-surface rounded-md py-2 items-center"
                    onPress={() => {
                      setShowForm(false);
                      setScheduleName('');
                      setOrderedRoutineIds([]);
                    }}
                  >
                    <Text className="text-white/60 font-semibold">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                className="mt-4 bg-surface-elevated rounded-lg py-3 items-center"
                onPress={() => setShowForm(true)}
              >
                <Text className="text-primary-400 font-semibold">
                  + New Schedule
                </Text>
              </Pressable>
            )
          }
        />
      </View>
    </View>
  );
}
