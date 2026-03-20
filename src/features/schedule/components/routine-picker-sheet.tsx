import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import type { Routine } from '@core/database/types';
import {
  ActionRow,
  Checkbox,
  Heading,
  Input,
  Label,
  Muted,
} from '@shared/components';
import { normalizeQuery } from '@shared/utils';
import { EditorSheet } from './editor-sheet';

export function RoutinePickerSheet({
  visible,
  routines,
  selectedRoutineIds,
  onClose,
  onAddRoutines,
}: {
  visible: boolean;
  routines: Routine[];
  selectedRoutineIds: string[];
  onClose: () => void;
  onAddRoutines: (routineIds: string[]) => void;
}): React.JSX.Element | null {
  const [query, setQuery] = useState('');
  const [pendingRoutineIds, setPendingRoutineIds] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setPendingRoutineIds([]);
    }
  }, [visible]);

  const handleToggleRoutine = useCallback((routineId: string): void => {
    setPendingRoutineIds((current) =>
      current.includes(routineId)
        ? current.filter((id) => id !== routineId)
        : [...current, routineId],
    );
  }, []);

  const handleClose = useCallback((): void => {
    setQuery('');
    setPendingRoutineIds([]);
    onClose();
  }, [onClose]);

  const handleAddSelected = useCallback((): void => {
    if (pendingRoutineIds.length === 0) {
      return;
    }

    onAddRoutines(pendingRoutineIds);
    handleClose();
  }, [handleClose, onAddRoutines, pendingRoutineIds]);

  const availableRoutines = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);

    return routines.filter((routine) => {
      if (selectedRoutineIds.includes(routine.id)) {
        return false;
      }

      if (pendingRoutineIds.includes(routine.id)) {
        return true;
      }

      if (normalizedQuery === '') {
        return true;
      }

      return normalizeQuery(routine.name).includes(normalizedQuery);
    });
  }, [pendingRoutineIds, query, routines, selectedRoutineIds]);

  return (
    <EditorSheet
      visible={visible}
      onClose={handleClose}
      footer={
        <ActionRow
          className="p-4 mb-2"
          primaryLabel="Add Selected"
          onPrimaryPress={handleAddSelected}
          primaryDisabled={pendingRoutineIds.length === 0}
        />
      }
    >
      <Heading className="text-2xl leading-[28px]">Add Routines</Heading>
      <Label className="mt-2">Search routines</Label>
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
            <Checkbox
              key={routine.id}
              accessibilityLabel={`Add ${routine.name}`}
              checked={pendingRoutineIds.includes(routine.id)}
              onToggle={() => handleToggleRoutine(routine.id)}
              label={routine.name}
              sublabel={routine.notes ? routine.notes : undefined}
              className="mb-0"
            />
          ))
        ) : (
          <Muted className="text-sm leading-5">
            {routines.length === 0
              ? 'No routines available yet. Create one from the Plan tab first.'
              : 'No matching routines available to add.'}
          </Muted>
        )}
      </View>
    </EditorSheet>
  );
}
