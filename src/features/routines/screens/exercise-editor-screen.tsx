import { useFocusEffect, type RouteProp } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text } from 'react-native';

import {
  Body,
  Button,
  Container,
  Input,
  Label,
  Muted,
} from '@shared/components';
import { useExercises } from '../hooks/use-exercises';
import type { NewExerciseInput } from '../hooks/use-exercises';
import type { RoutinesStackParamList } from '../types';

function getExerciseId(
  route: RouteProp<RoutinesStackParamList, 'ExerciseEditor'>,
): string | undefined {
  return route.params?.exerciseId;
}

export function ExerciseEditorScreen({
  route,
  navigation,
}: NativeStackScreenProps<
  RoutinesStackParamList,
  'ExerciseEditor'
>): React.JSX.Element {
  const headerHeight = useHeaderHeight();
  const {
    exercises,
    hasLoaded,
    refresh,
    createExercise,
    updateExercise,
    deleteExercise,
  } = useExercises();
  const exerciseId = getExerciseId(route);
  const selectedExercise =
    exercises.find((exercise) => exercise.id === exerciseId) ?? null;

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [howTo, setHowTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cancelActionRef = useRef<() => void>(() => undefined);
  const saveActionRef = useRef<() => void>(() => undefined);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (exerciseId === undefined) {
      setName('');
      setMuscleGroup('');
      setEquipment('');
      setHowTo('');
      setError(null);
      return;
    }

    if (selectedExercise === null) {
      if (hasLoaded) {
        navigation.goBack();
      }
      return;
    }

    setName(selectedExercise.name);
    setMuscleGroup(selectedExercise.muscle_group);
    setEquipment(selectedExercise.equipment ?? '');
    setHowTo(selectedExercise.how_to ?? '');
    setError(null);
  }, [exerciseId, hasLoaded, navigation, selectedExercise]);

  const handleCancel = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  const handleSave = useCallback((): void => {
    const trimmedName = name.trim();
    const trimmedMuscleGroup = muscleGroup.trim();

    if (!trimmedName || !trimmedMuscleGroup) {
      setError('Exercise name and muscle group are required.');
      return;
    }

    const input: NewExerciseInput = {
      name: trimmedName,
      muscleGroup: trimmedMuscleGroup,
      equipment,
      howTo,
    };

    setError(null);

    if (selectedExercise === null) {
      createExercise(input);
    } else {
      updateExercise(selectedExercise.id, input);
    }

    navigation.goBack();
  }, [
    createExercise,
    equipment,
    howTo,
    muscleGroup,
    name,
    navigation,
    selectedExercise,
    updateExercise,
  ]);

  cancelActionRef.current = handleCancel;
  saveActionRef.current = handleSave;

  useEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackVisible: false,
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          className="px-1 py-1"
          onPress={() => cancelActionRef.current()}
        >
          <Text className="font-mono text-base text-foreground">Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          className="px-1 py-1"
          onPress={() => saveActionRef.current()}
        >
          <Text className="font-mono text-base text-secondary">Save</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <Container edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        contentContainerStyle={{
          paddingTop: headerHeight + 8,
          paddingBottom: 28,
        }}
      >
        <Label>{selectedExercise ? 'Edit Exercise' : 'Create Exercise'}</Label>
        <Body className="mt-3 font-heading text-4xl leading-[36px]">
          {selectedExercise ? selectedExercise.name : 'New Exercise'}
        </Body>
        <Muted className="mt-3 text-sm leading-[18px]">
          Capture the setup cues and metadata you want available on the detail
          page later.
        </Muted>

        <Label className="mt-6">Exercise name</Label>
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

        {selectedExercise ? (
          <Button
            variant="ghost"
            className="mt-6 w-full"
            onPress={() =>
              Alert.alert(
                'Delete Exercise',
                `Delete ${selectedExercise.name} and remove it from any routines?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      deleteExercise(selectedExercise.id);
                      navigation.goBack();
                    },
                  },
                ],
              )
            }
          >
            Delete Exercise
          </Button>
        ) : null}
      </ScrollView>
    </Container>
  );
}
