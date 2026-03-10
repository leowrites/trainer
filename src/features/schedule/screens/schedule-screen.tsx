import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { useSchedules } from '../hooks/use-schedules';
import type { NewScheduleInput } from '../hooks/use-schedules';
import { useRoutines } from '@features/routines';
import type { Schedule, ScheduleEntry } from '@core/database/types';
import type { Routine } from '@core/database/types';

// ─── Schedule row ──────────────────────────────────────────────────────────────

interface ScheduleRowProps {
  item: Schedule;
  routines: Routine[];
  getScheduleEntries: (scheduleId: string) => ScheduleEntry[];
  onActivate: (id: string) => void;
  onEdit: (item: Schedule) => void;
  onDelete: (id: string) => void;
}

function ScheduleRow({
  item,
  routines,
  getScheduleEntries,
  onActivate,
  onEdit,
  onDelete,
}: ScheduleRowProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);

  const handleToggleExpand = (): void => {
    if (expanded) {
      setExpanded(false);
      setEntries([]);
    } else {
      setExpanded(true);
      setEntries(getScheduleEntries(item.id));
    }
  };

  return (
    <View className="bg-surface-elevated rounded-lg mb-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${item.name}`}
        className="flex-row items-center justify-between px-4 py-3"
        onPress={handleToggleExpand}
      >
        <View className="flex-1">
          <Text className="text-white font-medium">{item.name}</Text>
          {item.is_active ? (
            <Text className="text-primary-400 text-xs mt-0.5">● Active</Text>
          ) : (
            <Text className="text-white/40 text-xs mt-0.5">Inactive</Text>
          )}
        </View>
        <View className="flex-row gap-3 items-center">
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
            accessibilityLabel={`Edit ${item.name}`}
            onPress={() => onEdit(item)}
            hitSlop={8}
          >
            <Text className="text-primary-400 text-sm">Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
            onPress={() => onDelete(item.id)}
            hitSlop={8}
          >
            <Text className="text-red-400 text-sm">Delete</Text>
          </Pressable>
          <Text className="text-white/40 text-xs">{expanded ? '▲' : '▼'}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View className="px-4 pb-3 border-t border-white/10">
          {entries.length === 0 ? (
            <Text className="text-white/40 text-sm pt-2">
              No routines in this schedule.
            </Text>
          ) : (
            entries.map((entry: ScheduleEntry, idx: number) => {
              const routine = routines.find((r: Routine) => r.id === entry.routine_id);
              return (
                <Text key={entry.id} className="text-white/70 text-sm pt-2">
                  {idx + 1}. {routine ? routine.name : entry.routine_id}
                </Text>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export function ScheduleScreen(): React.JSX.Element {
  const {
    schedules,
    refresh: refreshSchedules,
    getScheduleEntries,
    createSchedule,
    updateSchedule,
    setActiveSchedule,
    deleteSchedule,
  } = useSchedules();
  const { routines, refresh: refreshRoutines } = useRoutines();

  // ── Create form state ──
  const [showForm, setShowForm] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [orderedRoutineIds, setOrderedRoutineIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Edit form state ──
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoutineIds, setEditRoutineIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshSchedules();
      refreshRoutines();
    }, [refreshSchedules, refreshRoutines]),
  );

  const toggleRoutine = (id: string): void => {
    setOrderedRoutineIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id],
    );
  };

  const toggleEditRoutine = (id: string): void => {
    setEditRoutineIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id],
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

  const handleStartEdit = (item: Schedule): void => {
    const currentEntries = getScheduleEntries(item.id);
    setEditingSchedule(item);
    setEditName(item.name);
    setEditRoutineIds(currentEntries.map((e: ScheduleEntry) => e.routine_id));
    setShowForm(false);
  };

  const handleSaveEdit = (): void => {
    if (!editingSchedule) return;
    const trimmedName = editName.trim();
    if (!trimmedName) return;
    setEditSaving(true);
    try {
      const input: NewScheduleInput = {
        name: trimmedName,
        routineIds: editRoutineIds,
      };
      updateSchedule(editingSchedule.id, input);
      setEditingSchedule(null);
    } finally {
      setEditSaving(false);
    }
  };

  const renderRoutineCheckbox = (
    routineId: string,
    selected: boolean,
    idx: number,
    onToggle: (id: string) => void,
  ): React.JSX.Element => {
    const routine = routines.find((r: Routine) => r.id === routineId);
    return (
      <Pressable
        key={routineId}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        className="flex-row items-center py-2"
        onPress={() => onToggle(routineId)}
      >
        <View
          className={`w-5 h-5 rounded mr-3 border items-center justify-center ${
            selected
              ? 'bg-primary-500 border-primary-500'
              : 'border-white/30'
          }`}
        >
          {selected ? (
            <Text className="text-white text-xs font-bold">{idx + 1}</Text>
          ) : null}
        </View>
        <Text className="text-white">{routine ? routine.name : routineId}</Text>
      </Pressable>
    );
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

      {/* Inline edit form */}
      {editingSchedule ? (
        <View className="mx-4 mb-4 bg-surface-elevated rounded-lg p-4">
          <Text className="text-white font-semibold mb-3">
            Edit Schedule
          </Text>
          <TextInput
            className="bg-surface text-white rounded-md px-3 py-2 mb-4"
            placeholder="Schedule name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={editName}
            onChangeText={setEditName}
            autoCapitalize="words"
          />
          <Text className="text-white/60 text-xs uppercase tracking-wider mb-2">
            Select Routines (in rotation order)
          </Text>
          {routines.length === 0 ? (
            <Text className="text-white/40 text-sm mb-4">
              No routines available.
            </Text>
          ) : (
            routines.map((routine) => {
              const idx = editRoutineIds.indexOf(routine.id);
              const selected = idx !== -1;
              return renderRoutineCheckbox(
                routine.id,
                selected,
                idx,
                toggleEditRoutine,
              );
            })
          )}
          <View className="flex-row gap-2 mt-4">
            <Pressable
              accessibilityRole="button"
              className="flex-1 bg-primary-600 rounded-md py-2 items-center"
              onPress={handleSaveEdit}
              disabled={editSaving}
            >
              {editSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Save</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="flex-1 bg-surface rounded-md py-2 items-center"
              onPress={() => setEditingSchedule(null)}
            >
              <Text className="text-white/60 font-semibold">Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className="flex-1 px-4">
        <FlatList
          data={schedules}
          keyExtractor={(item: Schedule) => item.id}
          renderItem={({ item }: { item: Schedule }) => (
            <ScheduleRow
              item={item}
              routines={routines}
              getScheduleEntries={getScheduleEntries}
              onActivate={(id) => setActiveSchedule(id)}
              onEdit={handleStartEdit}
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
