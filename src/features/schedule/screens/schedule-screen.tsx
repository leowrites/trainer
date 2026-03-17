import React, { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';

import { Button } from '@shared/components';
import { Box } from '@shared/ui/box';
import { Input, InputField } from '@shared/ui/input';
import { Pressable } from '@shared/ui/pressable';
import { Text } from '@shared/ui/text';

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
  /** Bumped by the parent on every mutation so the expanded list auto-refreshes. */
  entriesVersion: number;
  getScheduleEntries: (scheduleId: string) => ScheduleEntry[];
  onActivate: (id: string) => void;
  onEdit: (item: Schedule) => void;
  onDelete: (id: string) => void;
}

function ScheduleRow({
  item,
  routines,
  entriesVersion,
  getScheduleEntries,
  onActivate,
  onEdit,
  onDelete,
}: ScheduleRowProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);

  // Re-fetch entries whenever the mutation version changes (covers
  // updateSchedule, deleteSchedule, setActiveSchedule, etc.) or the
  // user toggles the row open. Using `item.id` alone is insufficient
  // because the schedule ID doesn't change when only entries change.
  useEffect(() => {
    if (expanded) {
      setEntries(getScheduleEntries(item.id));
    }
  }, [item.id, expanded, entriesVersion, getScheduleEntries]);

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
    <Box className="bg-surface-elevated rounded-lg mb-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${item.name}`}
        className="flex-row items-center justify-between px-4 py-3"
        onPress={handleToggleExpand}
      >
        <Box className="flex-1">
          <Text className="text-white font-medium">{item.name}</Text>
          {item.is_active ? (
            <Text className="text-primary-400 text-xs mt-0.5">● Active</Text>
          ) : (
            <Text className="text-white/40 text-xs mt-0.5">Inactive</Text>
          )}
        </Box>
        <Box className="flex-row gap-3 items-center">
          {!item.is_active && (
            <Button
              accessibilityLabel={`Set ${item.name} as active`}
              className="px-0"
              variant="ghost"
              size="sm"
              onPress={() => onActivate(item.id)}
            >
              Set Active
            </Button>
          )}
          <Button
            accessibilityLabel={`Edit ${item.name}`}
            className="px-0"
            variant="ghost"
            size="sm"
            onPress={() => onEdit(item)}
          >
            Edit
          </Button>
          <Button
            accessibilityLabel={`Delete ${item.name}`}
            className="px-0"
            variant="danger"
            size="sm"
            onPress={() => onDelete(item.id)}
          >
            Delete
          </Button>
          <Text className="text-white/40 text-xs">{expanded ? '▲' : '▼'}</Text>
        </Box>
      </Pressable>

      {expanded && (
        <Box className="px-4 pb-3 border-t border-white/10">
          {entries.length === 0 ? (
            <Text className="text-white/40 text-sm pt-2">
              No routines in this schedule.
            </Text>
          ) : (
            entries.map((entry: ScheduleEntry, idx: number) => {
              const routine = routines.find(
                (r: Routine) => r.id === entry.routine_id,
              );
              return (
                <Text key={entry.id} className="text-white/70 text-sm pt-2">
                  {idx + 1}. {routine ? routine.name : entry.routine_id}
                </Text>
              );
            })
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export function ScheduleScreen(): React.JSX.Element {
  const {
    schedules,
    refresh: refreshSchedules,
    version: scheduleVersion,
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
        <Box
          className={`w-5 h-5 rounded mr-3 border items-center justify-center ${
            selected ? 'bg-primary-500 border-primary-500' : 'border-white/30'
          }`}
        >
          {selected ? (
            <Text className="text-white text-xs font-bold">{idx + 1}</Text>
          ) : null}
        </Box>
        <Text className="text-white">{routine ? routine.name : routineId}</Text>
      </Pressable>
    );
  };

  return (
    <Box className="flex-1 bg-surface">
      {/* Header */}
      <Box className="pt-14 pb-4 px-4">
        <Text className="text-white text-2xl font-bold">Schedules</Text>
        <Text className="text-white/50 text-sm mt-1">
          Arrange routines into a rotating schedule (A → B → C → A)
        </Text>
      </Box>

      {/* Inline edit form */}
      {editingSchedule ? (
        <Box className="mx-4 mb-4 bg-surface-elevated rounded-lg p-4">
          <Text className="text-white font-semibold mb-3">Edit Schedule</Text>
          <Input className="mb-4 border-surface-border bg-surface">
            <InputField
              placeholder="Schedule name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="words"
              className="text-white"
            />
          </Input>
          <Text className="text-white/60 text-xs uppercase tracking-wider mb-2">
            Select Routines (in rotation order)
          </Text>
          {routines.length === 0 ? (
            <Text className="text-white/40 text-sm mb-4">
              No routines available.
            </Text>
          ) : (
            (() => {
              // Pre-compute position map for O(1) lookups while preserving order.
              const idxMap = new Map(
                editRoutineIds.map((id, i) => [id, i] as const),
              );
              return routines.map((routine) => {
                const idx = idxMap.get(routine.id) ?? -1;
                const selected = idx !== -1;
                return renderRoutineCheckbox(
                  routine.id,
                  selected,
                  idx,
                  toggleEditRoutine,
                );
              });
            })()
          )}
          <Box className="flex-row gap-2 mt-4">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onPress={handleSaveEdit}
              disabled={editSaving}
              loading={editSaving}
              accessibilityLabel="Save schedule changes"
            >
              Save
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="flex-1"
              onPress={() => setEditingSchedule(null)}
              accessibilityLabel="Cancel editing schedule"
            >
              Cancel
            </Button>
          </Box>
        </Box>
      ) : null}

      <Box className="flex-1 px-4">
        <FlatList
          data={schedules}
          keyExtractor={(item: Schedule) => item.id}
          renderItem={({ item }: { item: Schedule }) => (
            <ScheduleRow
              item={item}
              routines={routines}
              entriesVersion={scheduleVersion}
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
              <Box className="mt-4 bg-surface-elevated rounded-lg p-4">
                <Text className="text-white font-semibold mb-3">
                  New Schedule
                </Text>
                <Input className="mb-4 border-surface-border bg-surface">
                  <InputField
                    placeholder="Schedule name (e.g. Push/Pull Split)"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={scheduleName}
                    onChangeText={setScheduleName}
                    autoCapitalize="words"
                    className="text-white"
                  />
                </Input>
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
                        <Box
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
                        </Box>
                        <Text className="text-white">{routine.name}</Text>
                      </Pressable>
                    );
                  })
                )}
                <Box className="flex-row gap-2 mt-4">
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onPress={handleCreate}
                    disabled={saving}
                    loading={saving}
                    accessibilityLabel="Save new schedule"
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    className="flex-1"
                    onPress={() => {
                      setShowForm(false);
                      setScheduleName('');
                      setOrderedRoutineIds([]);
                    }}
                    accessibilityLabel="Cancel new schedule form"
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box className="mt-4 rounded-lg bg-surface-elevated">
                <Button
                  variant="ghost"
                  size="md"
                  className="w-full rounded-lg py-3"
                  onPress={() => setShowForm(true)}
                  accessibilityLabel="Create new schedule"
                >
                  + New Schedule
                </Button>
              </Box>
            )
          }
        />
      </Box>
    </Box>
  );
}
