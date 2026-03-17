import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  ActionRow,
  Badge,
  Body,
  Button,
  Caption,
  Card,
  Checkbox,
  Container,
  DisclosureCard,
  Heading,
  Input,
  Label,
  Muted,
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
    <DisclosureCard
      title={item.name}
      expanded={expanded}
      onToggle={handleToggleExpand}
      accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${item.name}`}
      headerMeta={
        item.is_active ? (
          <Badge variant="accent" className="mt-1 self-start">
            Active
          </Badge>
        ) : (
          <Caption className="mt-0.5">Inactive</Caption>
        )
      }
      actions={
        <>
          {!item.is_active && (
            <Button
              variant="ghost"
              size="sm"
              accessibilityLabel={`Set ${item.name} as active`}
              onPress={() => onActivate(item.id)}
            >
              Set Active
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            accessibilityLabel={`Edit ${item.name}`}
            onPress={() => onEdit(item)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            accessibilityLabel={`Delete ${item.name}`}
            onPress={() => onDelete(item.id)}
          >
            Delete
          </Button>
        </>
      }
    >
      {entries.length === 0 ? (
        <Muted className="pt-1">No routines in this schedule.</Muted>
      ) : (
        entries.map((entry: ScheduleEntry, idx: number) => {
          const routine = routines.find(
            (r: Routine) => r.id === entry.routine_id,
          );
          return (
            <Body key={entry.id} className="pt-2">
              {idx + 1}. {routine ? routine.name : entry.routine_id}
            </Body>
          );
        })
      )}
    </DisclosureCard>
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

  return (
    <Container className="pt-14">
      {/* Header */}
      <View className="pb-4">
        <Heading>Schedules</Heading>
        <Muted className="mt-1">
          Arrange routines into a rotating schedule (A → B → C → A)
        </Muted>
      </View>

      {/* Inline edit form */}
      {editingSchedule ? (
        <Card label="Edit Schedule" className="mb-4 rounded-xl">
          <Input
            className="mb-4"
            placeholder="Schedule name"
            value={editName}
            onChangeText={setEditName}
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
                    onToggle={() => toggleEditRoutine(routine.id)}
                    label={routine.name}
                    badgeText={selected ? String(idx + 1) : undefined}
                  />
                );
              });
            })()
          )}
          <ActionRow
            onPrimaryPress={handleSaveEdit}
            primaryLoading={editSaving}
            onSecondaryPress={() => setEditingSchedule(null)}
          />
        </Card>
      ) : null}

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
          <Muted className="text-center mt-8">
            No schedules yet. Create one below.
          </Muted>
        }
        ListFooterComponent={
          showForm ? (
            <Card label="New Schedule" className="mt-4 rounded-xl">
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
              className="mt-4 w-full"
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
