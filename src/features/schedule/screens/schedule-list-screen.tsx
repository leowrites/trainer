import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import type { Schedule } from '@core/database/types';
import { useRoutines } from '@features/routines';
import {
  Body,
  Button,
  Card,
  Container,
  Heading,
  Input,
  Label,
  Meta,
  Muted,
} from '@shared/components';
import { normalizeQuery } from '@shared/utils';
import {
  buildScheduleSummary,
  getActiveScheduleSummary,
  getScheduleStatusText,
} from '../domain/schedule-preview';
import { useSchedules } from '../hooks/use-schedules';
import type { ScheduleStackParamList } from '../types';

function ScheduleListCard({
  schedule,
  routineCount,
  nextRoutineName,
  onPress,
}: {
  schedule: Schedule;
  routineCount: number;
  nextRoutineName: string | null;
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
          <Muted className="mt-2 text-sm leading-[18px]">
            {nextRoutineName
              ? `Next up: ${nextRoutineName}`
              : 'No routines in this schedule yet'}
          </Muted>
        </View>
        <View className="items-end">
          <Label className={schedule.is_active ? 'text-secondary' : ''}>
            {schedule.is_active ? 'Active' : 'Inactive'}
          </Label>
          <Meta className="mt-2">
            {schedule.current_position >= 0
              ? `Last ${schedule.current_position + 1}`
              : 'Not started'}
          </Meta>
        </View>
      </View>
    </Card>
  );
}

export function ScheduleListScreen({
  navigation,
}: NativeStackScreenProps<
  ScheduleStackParamList,
  'ScheduleList'
>): React.JSX.Element {
  const {
    schedules,
    refresh: refreshSchedules,
    getScheduleEntries,
  } = useSchedules();
  const { routines, refresh: refreshRoutines } = useRoutines();
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      refreshSchedules();
      refreshRoutines();
    }, [refreshSchedules, refreshRoutines]),
  );

  const activeSummary = useMemo(
    () => getActiveScheduleSummary(schedules, routines, getScheduleEntries),
    [getScheduleEntries, routines, schedules],
  );

  const filteredSchedules = useMemo(() => {
    const query = normalizeQuery(searchQuery);

    return schedules.filter((schedule) => {
      if (query === '') {
        return true;
      }

      return normalizeQuery(schedule.name).includes(query);
    });
  }, [schedules, searchQuery]);

  return (
    <Container edges={['left', 'right']}>
      <FlatList
        data={filteredSchedules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const entries = getScheduleEntries(item.id);
          const summary = buildScheduleSummary(item, entries, routines);

          return (
            <ScheduleListCard
              schedule={item}
              routineCount={summary.routineCount}
              nextRoutineName={summary.nextRoutineName}
              onPress={() =>
                navigation.navigate('ScheduleDetail', { scheduleId: item.id })
              }
            />
          );
        }}
        ListHeaderComponent={
          <View className="pb-5">
            <View accessibilityRole="header" className="gap-2">
              <Heading className="text-4xl leading-[36px]">Schedule</Heading>
              <Muted className="max-w-[320px] text-sm leading-[19px]">
                Search every schedule, inspect the next routine in rotation, and
                edit each plan from its own dedicated detail flow.
              </Muted>
            </View>

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
              <Body className="mt-3 font-heading text-[28px] leading-[30px]">
                {activeSummary?.schedule.name ?? 'No active schedule'}
              </Body>
              <Muted className="mt-3 text-sm leading-[18px]">
                {activeSummary
                  ? getScheduleStatusText(activeSummary)
                  : 'Create a schedule to keep your next workout predictable.'}
              </Muted>
            </Card>

            <Input
              className="mt-4"
              placeholder="Search schedules"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Button
              className="mt-4 w-full"
              onPress={() => navigation.navigate('ScheduleDetail', {})}
            >
              New Schedule
            </Button>
          </View>
        }
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
