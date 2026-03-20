import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { startTransition, useCallback, useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { useFocusEffect, type NavigationProp } from '@react-navigation/native';

import type { RootStackParamList } from '@core/navigation';
import { Body, Card, Container, Muted } from '@shared/components';
import { ExerciseEditorSheet } from '../components/exercise-editor-sheet';
import { LibraryExerciseCard } from '../components/library-exercise-card';
import { LibraryHeader } from '../components/library-header';
import { LibraryRoutineCard } from '../components/library-routine-card';
import { RoutineEditorSheet } from '../components/routine-editor-sheet';
import { useExercises } from '../hooks/use-exercises';
import { useRoutines } from '../hooks/use-routines';
import type { RoutinesStackParamList, Section } from '../types';
import { normalizeQuery } from '../utils/formatters';

export function LibraryScreen({
  navigation,
}: NativeStackScreenProps<
  RoutinesStackParamList,
  'Library'
>): React.JSX.Element {
  const {
    exercises,
    createExercise,
    refresh: refreshExercises,
  } = useExercises();
  const {
    routines,
    getRoutineExerciseCounts,
    createRoutine,
    refresh: refreshRoutines,
  } = useRoutines();
  const routineExerciseCounts = getRoutineExerciseCounts();

  useFocusEffect(
    useCallback(() => {
      refreshExercises();
      refreshRoutines();
    }, [refreshExercises, refreshRoutines]),
  );

  const [section, setSection] = useState<Section>('exercises');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExerciseSheetOpen, setIsExerciseSheetOpen] = useState(false);
  const [isRoutineSheetOpen, setIsRoutineSheetOpen] = useState(false);

  const filteredExercises = useMemo(() => {
    const query = normalizeQuery(searchQuery);

    return exercises.filter((exercise) => {
      if (query === '') {
        return true;
      }

      return (
        normalizeQuery(exercise.name).includes(query) ||
        normalizeQuery(exercise.muscle_group).includes(query)
      );
    });
  }, [exercises, searchQuery]);

  const filteredRoutines = useMemo(() => {
    const query = normalizeQuery(searchQuery);

    return routines.filter((routine) => {
      if (query === '') {
        return true;
      }

      return normalizeQuery(routine.name).includes(query);
    });
  }, [routines, searchQuery]);

  const handleChangeSection = useCallback((nextSection: Section): void => {
    startTransition(() => {
      setSection(nextSection);
    });
  }, []);

  const handleCreatePress = useCallback((): void => {
    setSearchQuery('');

    if (section === 'exercises') {
      setIsExerciseSheetOpen(true);
      return;
    }

    setIsRoutineSheetOpen(true);
  }, [section]);

  const openExerciseDetail = useCallback(
    (exerciseId: string): void => {
      const rootNavigation = navigation
        .getParent()
        ?.getParent<NavigationProp<RootStackParamList>>();

      if (rootNavigation) {
        rootNavigation.navigate('ExerciseDetail', { exerciseId });
        return;
      }

      navigation.navigate('ExerciseDetail', { exerciseId });
    },
    [navigation],
  );

  const openRoutineDetail = useCallback(
    (routineId: string): void => {
      const rootNavigation = navigation
        .getParent()
        ?.getParent<NavigationProp<RootStackParamList>>();

      if (rootNavigation) {
        rootNavigation.navigate('RoutineDetail', { routineId });
        return;
      }

      navigation.navigate('RoutineDetail', { routineId });
    },
    [navigation],
  );

  const libraryHeader = (
    <LibraryHeader
      section={section}
      exercisesCount={exercises.length}
      routinesCount={routines.length}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onChangeSection={handleChangeSection}
      onCreate={handleCreatePress}
    />
  );

  return (
    <Container>
      {section === 'exercises' ? (
        <FlatList
          data={filteredExercises}
          keyExtractor={(exercise) => exercise.id}
          renderItem={({ item }) => (
            <LibraryExerciseCard
              exercise={item}
              onPress={() => openExerciseDetail(item.id)}
            />
          )}
          ListHeaderComponent={libraryHeader}
          ListEmptyComponent={
            <Card className="rounded-[24px] px-5 py-5">
              <Body className="font-medium">No matching exercises</Body>
              <Muted className="mt-2 text-sm leading-[18px]">
                Try another search or create a new exercise from the button
                above.
              </Muted>
            </Card>
          }
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredRoutines}
          keyExtractor={(routine) => routine.id}
          renderItem={({ item }) => (
            <LibraryRoutineCard
              routine={item}
              exerciseCount={routineExerciseCounts[item.id] ?? 0}
              onPress={() => openRoutineDetail(item.id)}
            />
          )}
          ListHeaderComponent={libraryHeader}
          ListEmptyComponent={
            <Card className="rounded-[24px] px-5 py-5">
              <Body className="font-medium">No matching routines</Body>
              <Muted className="mt-2 text-sm leading-[18px]">
                Try another search or create a new routine from the button
                above.
              </Muted>
            </Card>
          }
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ExerciseEditorSheet
        visible={isExerciseSheetOpen}
        exercise={null}
        onClose={() => setIsExerciseSheetOpen(false)}
        onSave={(input) => {
          const createdExercise = createExercise(input);
          setIsExerciseSheetOpen(false);
          openExerciseDetail(createdExercise.id);
        }}
      />

      <RoutineEditorSheet
        visible={isRoutineSheetOpen}
        routine={null}
        exercises={exercises}
        routineExercises={[]}
        onClose={() => setIsRoutineSheetOpen(false)}
        onSave={(input) => {
          const createdRoutine = createRoutine(input);
          setIsRoutineSheetOpen(false);
          openRoutineDetail(createdRoutine.id);
        }}
      />
    </Container>
  );
}
