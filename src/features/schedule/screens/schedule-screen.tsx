import React, { useCallback, useState } from 'react';
import { FlatList } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import type { Schedule, ScheduleEntry } from '@core/database/types';
import { useRoutines } from '@features/routines';
import {
  ActionRow,
  Button,
  Card,
  Checkbox,
  Container,
  Input,
  Label,
  Muted,
} from '@shared/components';
import { useSchedules } from '../hooks/use-schedules';
import type { NewScheduleInput } from '../hooks/use-schedules';
import { ScheduleListHeader } from '../components/schedule-list-header';
import { ScheduleRow } from '../components/schedule-row';

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
