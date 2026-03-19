import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  ActionRow,
  Body,
  Button,
  Caption,
  Card,
  Checkbox,
  Container,
  DisplayHeading,
  Heading,
  Input,
  Label,
  Muted,
  Meta,
  Surface,
} from '@shared/components';
import { useRoutines } from '@features/routines';
import type { Schedule, ScheduleEntry } from '@core/database/types';
import type { Routine } from '@core/database/types';
import { useSchedules } from '../hooks/use-schedules';
import type { NewScheduleInput } from '../hooks/use-schedules';

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
  const routineCount = expanded
    ? entries.length
    : getScheduleEntries(item.id).length;

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
    <Surface
      variant="card"
      className="mx-0 mb-3 overflow-hidden rounded-[24px] border border-surface-border/80 p-0"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${item.name}`}
        onPress={handleToggleExpand}
        className="px-5 py-5"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Body className="font-heading text-2xl leading-[24px]">
              {item.name}
            </Body>
            <Meta className="mt-1">
              {routineCount} routine{routineCount === 1 ? '' : 's'}
            </Meta>
          </View>
          <View className="items-end">
            <Label className={item.is_active ? 'text-secondary' : ''}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Label>
            <Caption className="mt-1 text-muted-foreground">
              {expanded ? 'Collapse' : 'Expand'}
            </Caption>
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View className="border-t border-surface-border/70 px-5 pb-5 pt-4">
          {entries.length === 0 ? (
            <Muted className="text-sm leading-[17px]">
              No routines in this schedule.
            </Muted>
          ) : (
            entries.map((entry: ScheduleEntry, idx: number) => {
              const routine = routines.find(
                (r: Routine) => r.id === entry.routine_id,
              );
              return (
                <View
                  key={entry.id}
                  className={
                    idx === 0 ? 'pb-2' : 'border-t border-surface-border py-2'
                  }
                >
                  <Body className="text-sm leading-[18px]">
                    {idx + 1}. {routine ? routine.name : entry.routine_id}
                  </Body>
                </View>
              );
            })
          )}

          <View className="mt-4 border-t border-surface-border/70 pt-4">
            <View className="gap-2">
              {!item.is_active ? (
                <Button
                  size="sm"
                  className="w-full"
                  accessibilityLabel={`Set ${item.name} as active`}
                  onPress={() => onActivate(item.id)}
                >
                  Set Active
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                accessibilityLabel={`Edit ${item.name}`}
                onPress={() => onEdit(item)}
              >
                Edit
              </Button>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.name}`}
              className="mt-3 self-start px-1 py-1"
              onPress={() => onDelete(item.id)}
            >
              <Caption className="text-muted-foreground">Delete</Caption>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Surface>
  );
}

// ─── List header ───────────────────────────────────────────────────────────────

function ScheduleListHeader({
  activeSchedule,
  activeEntries,
  routines,
  editingSchedule,
  editName,
  editRoutineIds,
  editSaving,
  onEditNameChange,
  onToggleEditRoutine,
  onSaveEdit,
  onCancelEdit,
}: {
  activeSchedule: Schedule | null;
  activeEntries: ScheduleEntry[];
  routines: Routine[];
  editingSchedule: Schedule | null;
  editName: string;
  editRoutineIds: string[];
  editSaving: boolean;
  onEditNameChange: (value: string) => void;
  onToggleEditRoutine: (id: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}): React.JSX.Element {
  return (
    <View>
      <View accessibilityRole="header" className="gap-2">
        <Heading className="text-4xl leading-[36px]">Schedule</Heading>
        <Muted className="text-sm leading-[19px]">
          Arrange routines into a steady rotation and keep the next session
          predictable.
        </Muted>
      </View>

      <View className="py-3">
        <Surface variant="card" className="mx-0 rounded-[24px] px-5 py-5">
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <Meta>{activeSchedule ? 'Active Schedule' : 'Schedule Setup'}</Meta>
            <Meta className="text-foreground">
              {activeSchedule
                ? `${activeEntries.length} routines`
                : `${routines.length} routines`}
            </Meta>
          </View>
          <DisplayHeading className="text-[28px] leading-[30px]">
            {activeSchedule?.name ?? 'No active schedule'}
          </DisplayHeading>
          <Muted className="mt-3 text-sm leading-[18px]">
            {activeSchedule
              ? activeSchedule.current_position >= 0
                ? `Rotation position ${activeSchedule.current_position + 1}`
                : 'Ready to start from the first routine.'
              : 'Create a schedule to queue your next workout from the routines you already trust.'}
          </Muted>
        </Surface>
      </View>

      {editingSchedule ? (
        <Card label="Edit Schedule" className="mx-0 mb-3 rounded-[24px] p-5">
          <Input
            className="mb-4"
            placeholder="Schedule name"
            value={editName}
            onChangeText={onEditNameChange}
            autoCapitalize="words"
          />
          <Label className="mb-2">Select Routines (in rotation order)</Label>
          {routines.length === 0 ? (
            <Muted className="mb-4">No routines available.</Muted>
          ) : (
            (() => {
              // Pre-compute position map for O(1) lookups while preserving order.
              const idxMap = new Map(
                editRoutineIds.map((id, i) => [id, i] as const),
              );
              return routines.map((routine) => {
                const idx = idxMap.get(routine.id) ?? -1;
                const selected = idx !== -1;
                return (
                  <Checkbox
                    key={routine.id}
                    checked={selected}
                    onToggle={() => onToggleEditRoutine(routine.id)}
                    label={routine.name}
                    badgeText={selected ? String(idx + 1) : undefined}
                  />
                );
              });
            })()
          )}
          <ActionRow
            onPrimaryPress={onSaveEdit}
            primaryLoading={editSaving}
            onSecondaryPress={onCancelEdit}
          />
        </Card>
      ) : null}
    </View>
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
  const activeSchedule =
    schedules.find((schedule: Schedule) => schedule.is_active === 1) ?? null;
  const activeEntries = activeSchedule
    ? getScheduleEntries(activeSchedule.id)
    : [];

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

  return (
    <Container className="px-0 pb-0" edges={['left', 'right']}>
      <FlatList
        data={schedules}
        keyExtractor={(item: Schedule) => item.id}
        contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
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
        ListHeaderComponent={
          <ScheduleListHeader
            activeSchedule={activeSchedule}
            activeEntries={activeEntries}
            routines={routines}
            editingSchedule={editingSchedule}
            editName={editName}
            editRoutineIds={editRoutineIds}
            editSaving={editSaving}
            onEditNameChange={setEditName}
            onToggleEditRoutine={toggleEditRoutine}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={() => setEditingSchedule(null)}
          />
        }
        ListEmptyComponent={
          <Muted className="mt-3 px-0 text-center text-sm leading-[18px]">
            No schedules yet. Create one below.
          </Muted>
        }
        ListFooterComponent={
          showForm ? (
            <Card label="New Schedule" className="mx-0 mt-3 rounded-[20px] p-4">
              <Input
                className="mb-4"
                placeholder="Schedule name (e.g. Push/Pull Split)"
                value={scheduleName}
                onChangeText={setScheduleName}
                autoCapitalize="words"
              />
              <Label className="mb-2">
                Select Routines (in rotation order)
              </Label>
              {routines.length === 0 ? (
                <Muted className="mb-4">
                  No routines available — create some in the Routines screen.
                </Muted>
              ) : (
                routines.map((routine) => {
                  const idx = orderedRoutineIds.indexOf(routine.id);
                  const selected = idx !== -1;
                  return (
                    <Checkbox
                      key={routine.id}
                      checked={selected}
                      onToggle={() => toggleRoutine(routine.id)}
                      label={routine.name}
                      badgeText={selected ? String(idx + 1) : undefined}
                    />
                  );
                })
              )}
              <ActionRow
                onPrimaryPress={handleCreate}
                primaryLoading={saving}
                onSecondaryPress={() => {
                  setShowForm(false);
                  setScheduleName('');
                  setOrderedRoutineIds([]);
                }}
              />
            </Card>
          ) : (
            <Button
              variant="ghost"
              className="mx-0 mt-3 w-full rounded-[20px]"
              onPress={() => setShowForm(true)}
            >
              + New Schedule
            </Button>
          )
        }
      />
    </Container>
  );
}
