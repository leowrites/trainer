import React from 'react';
import { View } from 'react-native';

import type { Routine, Schedule, ScheduleEntry } from '@core/database/types';
import {
  ActionRow,
  Card,
  Checkbox,
  DisplayHeading,
  Heading,
  Input,
  Label,
  Meta,
  Muted,
  Surface,
} from '@shared/components';

export function ScheduleListHeader({
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
