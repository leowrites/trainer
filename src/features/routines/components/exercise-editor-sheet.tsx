import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import type { Exercise } from '@core/database/types';
import { Button, Heading, Input, Label, Muted } from '@shared/components';
import type { NewExerciseInput } from '../hooks/use-exercises';
import { EditorSheet } from './editor-sheet';

export function ExerciseEditorSheet({
  visible,
  exercise,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (input: NewExerciseInput) => void;
  onDelete?: () => void;
}): React.JSX.Element | null {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [howTo, setHowTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setName(exercise?.name ?? '');
    setMuscleGroup(exercise?.muscle_group ?? '');
    setEquipment(exercise?.equipment ?? '');
    setHowTo(exercise?.how_to ?? '');
    setError(null);
  }, [exercise, visible]);

  const handleSave = (): void => {
    const trimmedName = name.trim();
    const trimmedMuscleGroup = muscleGroup.trim();

    if (!trimmedName || !trimmedMuscleGroup) {
      setError('Exercise name and muscle group are required.');
      return;
    }

    setError(null);
    onSave({
      name: trimmedName,
      muscleGroup: trimmedMuscleGroup,
      howTo,
      equipment,
    });
  };

  return (
    <EditorSheet visible={visible} onClose={onClose}>
      <Heading className="text-2xl leading-[28px]">
        {exercise ? 'Edit Exercise' : 'Create Exercise'}
      </Heading>
      <Muted className="mt-2 text-sm leading-[18px]">
        Capture the setup cues and metadata you want available on the detail
        page later.
      </Muted>

      <Label className="mt-5">Exercise name</Label>
      <Input
        className="mt-3"
        placeholder="Bench Press"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <Label className="mt-4">Muscle group</Label>
      <Input
        className="mt-3"
        placeholder="Chest"
        value={muscleGroup}
        onChangeText={setMuscleGroup}
        autoCapitalize="words"
      />

      <Label className="mt-4">Equipment</Label>
      <Input
        className="mt-3"
        placeholder="Barbell, bench"
        value={equipment}
        onChangeText={setEquipment}
        autoCapitalize="words"
      />

      <Label className="mt-4">How-to</Label>
      <Input
        className="mt-3 min-h-[120px] pt-4"
        placeholder="Short setup cues, execution notes, and safety reminders"
        value={howTo}
        onChangeText={setHowTo}
        multiline
        numberOfLines={5}
        autoCapitalize="sentences"
      />

      {error ? <Muted className="mt-4 text-error">{error}</Muted> : null}

      <Button className="mt-5 w-full" onPress={handleSave}>
        {exercise ? 'Save Exercise' : 'Create Exercise'}
      </Button>

      <Button variant="ghost" className="mt-3 w-full" onPress={onClose}>
        {exercise ? 'Cancel Edit' : 'Cancel'}
      </Button>

      {exercise && onDelete ? (
        <Button
          variant="ghost"
          className="mt-3 w-full"
          onPress={() =>
            Alert.alert(
              'Delete Exercise',
              `Delete ${exercise.name} and remove it from any routines?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: onDelete,
                },
              ],
            )
          }
        >
          Delete Exercise
        </Button>
      ) : null}
    </EditorSheet>
  );
}
