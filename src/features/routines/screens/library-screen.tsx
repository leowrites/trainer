import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { startTransition, useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect, type NavigationProp } from '@react-navigation/native';

import type { Schedule } from '@core/database/types';
import type { RootStackParamList } from '@core/navigation';
import {
  buildScheduleSummary,
  getActiveScheduleSummary,
  getScheduleStatusText,
  useSchedules,
} from '@features/schedule';
import { Body, Card, Container, Label, Meta, Muted } from '@shared/components';
import { normalizeQuery } from '@shared/utils';
import { LibraryExerciseCard } from '../components/library-exercise-card';
import { LibraryHeader } from '../components/library-header';
import { LibraryRoutineCard } from '../components/library-routine-card';
import { useExercises } from '../hooks/use-exercises';
import { useRoutines } from '../hooks/use-routines';
import type { RoutinesStackParamList, Section } from '../types';

function ScheduleListCard({
  schedule,
  routineCount,
  onPress,
}: {
  schedule: Schedule;
  routineCount: number;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card
      className="mb-3 rounded-[24px] px-5 py-5"
      onPress={onPress}
      accessibilityLabel={`Open ${schedule.name}`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Body className="font-heading text-2xl leading-[28px]">
            {schedule.name}
          </Body>
          <Muted className="mt-2 text-sm leading-[18px]">
            {routineCount} routine{routineCount === 1 ? '' : 's'}
          </Muted>
        </View>
        <View className="items-end">
          <Label className={schedule.is_active ? 'text-secondary' : ''}>
            {schedule.is_active ? 'Active' : 'Inactive'}
          </Label>
        </View>
      </View>
    </Card>
  );
}

export function LibraryScreen({
  navigation,
}: NativeStackScreenProps<
  RoutinesStackParamList,
  'Library'
>): React.JSX.Element {
  const { exercises, refresh: refreshExercises } = useExercises();
  const {
    routines,
    getRoutineExerciseCounts,
    refresh: refreshRoutines,
  } = useRoutines();
  const {
    schedules,
    refresh: refreshSchedules,
    getScheduleEntries,
  } = useSchedules();
  const routineExerciseCounts = getRoutineExerciseCounts();

  useFocusEffect(
    useCallback(() => {
      refreshExercises();
      refreshRoutines();
      refreshSchedules();
    }, [refreshExercises, refreshRoutines, refreshSchedules]),
  );

  const [section, setSection] = useState<Section>('schedules');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredSchedules = useMemo(() => {
    const query = normalizeQuery(searchQuery);

    return schedules.filter((schedule) => {
      if (query === '') {
        return true;
      }

      return normalizeQuery(schedule.name).includes(query);
    });
  }, [schedules, searchQuery]);

  const activeSummary = useMemo(
    () => getActiveScheduleSummary(schedules, routines, getScheduleEntries),
    [getScheduleEntries, routines, schedules],
  );

  const handleChangeSection = useCallback(
    (nextSection: Section): void => {
      if (section === nextSection) {
        return;
      }

      startTransition(() => {
        setSection(nextSection);
        setSearchQuery('');
      });
    },
    [section],
  );

  const handleCreatePress = useCallback((): void => {
    const rootNavigation = navigation
      .getParent()
      ?.getParent<NavigationProp<RootStackParamList>>();

    if (section === 'schedules') {
      navigation.navigate('ScheduleDetail', {});
      return;
    }

    if (section === 'routines') {
      if (rootNavigation) {
        rootNavigation.navigate('RoutineEditor', {});
        return;
      }

      navigation.navigate('RoutineEditor', {});
      return;
    }

    if (rootNavigation) {
      rootNavigation.navigate('ExerciseEditor', {});
      return;
    }

    navigation.navigate('ExerciseEditor', {});
  }, [navigation, section]);

  const openExerciseDetail = useCallback(
    (exerciseId: string): void => {
      navigation.navigate('ExerciseDetail', { exerciseId });
    },
    [navigation],
  );

  const openRoutineDetail = useCallback(
    (routineId: string): void => {
      navigation.navigate('RoutineDetail', { routineId });
    },
    [navigation],
  );

  const headerSummary =
    section === 'schedules' ? (
      <Card className="mt-4 rounded-[24px] px-5 py-5">
        <View className="flex-row items-center justify-between gap-3">
          <Label className={activeSummary ? 'text-secondary' : ''}>
            {activeSummary ? 'Active Schedule' : 'Schedule Setup'}
          </Label>
          <Meta>
            {activeSummary
              ? `${activeSummary.routineCount} routine${
                  activeSummary.routineCount === 1 ? '' : 's'
                }`
              : `${routines.length} routines available`}
          </Meta>
        </View>
        <Body className="mt-3 font-heading text-2xl leading-[28px]">
          {activeSummary?.schedule.name ?? 'No active schedule'}
        </Body>
        <Muted className="mt-3 text-sm leading-[18px]">
          {activeSummary
            ? getScheduleStatusText(activeSummary)
            : 'Create a schedule to keep your next workout predictable.'}
        </Muted>
      </Card>
    ) : null;

  const libraryHeader = (
    <LibraryHeader
      section={section}
      schedulesCount={schedules.length}
      exercisesCount={exercises.length}
      routinesCount={routines.length}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onChangeSection={handleChangeSection}
      onCreate={handleCreatePress}
    >
      {headerSummary}
    </LibraryHeader>
  );

  if (section === 'schedules') {
    return (
      <Container>
        <FlatList
          data={filteredSchedules}
          keyExtractor={(schedule) => schedule.id}
          renderItem={({ item }) => {
            const entries = getScheduleEntries(item.id);
            const summary = buildScheduleSummary(item, entries, routines);

            return (
              <ScheduleListCard
                schedule={item}
                routineCount={summary.routineCount}
                onPress={() =>
                  navigation.navigate('ScheduleDetail', {
                    scheduleId: item.id,
                  })
                }
              />
            );
          }}
          ListHeaderComponent={libraryHeader}
          ListEmptyComponent={
            <Card className="rounded-[24px] px-5 py-5">
              <Body className="font-medium">
                {searchQuery.trim() === ''
                  ? 'No schedules yet'
                  : 'No matching schedules'}
              </Body>
              <Muted className="mt-2 text-sm leading-[18px]">
                {searchQuery.trim() === ''
                  ? 'Create a schedule to start organizing routines into a rotation.'
                  : 'Try another search or create a new schedule above.'}
              </Muted>
            </Card>
          }
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        />
      </Container>
    );
  }

  if (section === 'routines') {
    return (
      <Container>
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
              <Body className="font-medium">
                {searchQuery.trim() === ''
                  ? 'No routines yet'
                  : 'No matching routines'}
              </Body>
              <Muted className="mt-2 text-sm leading-[18px]">
                {searchQuery.trim() === ''
                  ? 'Create a routine to turn your exercise library into something you can run.'
                  : 'Try another search or create a new routine above.'}
              </Muted>
            </Card>
          }
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        />
      </Container>
    );
  }

  return (
    <Container>
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
            <Body className="font-medium">
              {searchQuery.trim() === ''
                ? 'No exercises yet'
                : 'No matching exercises'}
            </Body>
            <Muted className="mt-2 text-sm leading-[18px]">
              {searchQuery.trim() === ''
                ? 'Create an exercise so it is ready to be added into routines.'
                : 'Try another search or create a new exercise above.'}
            </Muted>
          </Card>
        }
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      />
    </Container>
  );
}
