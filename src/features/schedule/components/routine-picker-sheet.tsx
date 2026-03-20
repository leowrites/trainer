import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { Routine } from '@core/database/types';
import { Body, Button, Heading, Input, Label, Muted } from '@shared/components';
import { normalizeQuery } from '@shared/utils';
import { EditorSheet } from './editor-sheet';

export function RoutinePickerSheet({
  visible,
  routines,
  selectedRoutineIds,
  onClose,
  onAddRoutine,
}: {
  visible: boolean;
  routines: Routine[];
  selectedRoutineIds: string[];
  onClose: () => void;
  onAddRoutine: (routineId: string) => void;
}): React.JSX.Element | null {
  const [query, setQuery] = useState('');

  const availableRoutines = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);

    return routines.filter((routine) => {
      if (selectedRoutineIds.includes(routine.id)) {
        return false;
      }

      if (normalizedQuery === '') {
        return true;
      }

      return normalizeQuery(routine.name).includes(normalizedQuery);
    });
  }, [query, routines, selectedRoutineIds]);

  return (
    <EditorSheet
      visible={visible}
      onClose={() => {
        setQuery('');
        onClose();
      }}
    >
      <Heading className="text-2xl leading-[28px]">Add Routine</Heading>
      <Muted className="mt-2 text-sm leading-[18px]">
        Search your routines library and append the next routine to this
        schedule.
      </Muted>

      <Label className="mt-5">Search routines</Label>
      <Input
        className="mt-3"
        placeholder="Search routines to add"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View className="mt-4 gap-2">
        {availableRoutines.length > 0 ? (
          availableRoutines.map((routine) => (
            <Pressable
              key={routine.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${routine.name}`}
              className="rounded-[18px] border border-surface-border bg-surface-elevated px-4 py-4"
              onPress={() => {
                onAddRoutine(routine.id);
                setQuery('');
                onClose();
              }}
            >
              <Body className="font-medium">{routine.name}</Body>
              <Muted className="mt-1 text-sm leading-[18px]">
                Add this routine to the end of the rotation.
              </Muted>
            </Pressable>
          ))
        ) : (
          <Muted className="text-sm leading-[18px]">
            {routines.length === 0
              ? 'No routines available yet. Create one from the Routines tab first.'
              : 'No matching routines available to add.'}
          </Muted>
        )}
      </View>

      <Button variant="ghost" className="mt-5 w-full" onPress={onClose}>
        Close
      </Button>
    </EditorSheet>
  );
}
