import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { Routine, Schedule, ScheduleEntry } from '@core/database/types';
import {
  Body,
  Button,
  Caption,
  Label,
  Meta,
  Muted,
  Surface,
} from '@shared/components';

export interface ScheduleRowProps {
  item: Schedule;
  routines: Routine[];
  /** Bumped by the parent on every mutation so the expanded list auto-refreshes. */
  entriesVersion: number;
  getScheduleEntries: (scheduleId: string) => ScheduleEntry[];
  onActivate: (id: string) => void;
  onEdit: (item: Schedule) => void;
  onDelete: (id: string) => void;
}

export function ScheduleRow({
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
