import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  type CompositeScreenProps,
  useFocusEffect,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList, RootTabParamList } from '@core/navigation';
import {
  buildDashboardMetrics,
  type HistorySession,
  useHistoryAnalytics,
} from '@features/analytics';
import {
  useExerciseCapabilities,
  useIntelligenceOverview,
  useTrainingGoals,
} from '@features/intelligence';
import {
  Body,
  Button,
  Card,
  Container,
  DayTile,
  DisplayHeading,
  Heading,
  InteractivePressable,
  Label,
  Meta,
  Muted,
  Surface,
} from '@shared/components';
import { useWorkoutStarter } from '../hooks/use-workout-starter';
import {
  selectActiveWorkoutExerciseCount,
  selectActiveWorkoutTitle,
  useWorkoutStore,
} from '../store';

export type WorkoutHomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<RootTabParamList, 'Workout'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface WeekCalendarDay {
  key: string;
  dayLabel: string;
  dateLabel: string;
  hasWorkout: boolean;
  isToday: boolean;
}

function startOfLocalDay(timestamp: number): Date {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getStartOfLocalWeek(timestamp: number, weekStartsOn = 0): Date {
  const date = startOfLocalDay(timestamp);
  const currentDay = date.getDay();
  const normalizedWeekStart = ((weekStartsOn % 7) + 7) % 7;
  const dayOffset = (currentDay - normalizedWeekStart + 7) % 7;

  date.setDate(date.getDate() - dayOffset);
  return date;
}

function buildWeekCalendarDays(
  sessions: HistorySession[],
  now: number,
  weekStartsOn = 0,
): WeekCalendarDay[] {
  const startOfWeek = getStartOfLocalWeek(now, weekStartsOn);
  const todayKey = startOfLocalDay(now).toISOString();
  const completedDayKeys = new Set(
    sessions
      .filter((session) => session.endTime !== null)
      .map((session) =>
        startOfLocalDay(session.endTime as number).toISOString(),
      ),
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);

    const key = date.toISOString();

    return {
      key,
      dayLabel: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      dateLabel: date.toLocaleDateString(undefined, { day: 'numeric' }),
      hasWorkout: completedDayKeys.has(key),
      isToday: key === todayKey,
    };
  });
}

export function WorkoutHomeScreen({
  navigation,
}: WorkoutHomeScreenProps): React.JSX.Element {
  const {
    currentWorkoutTitle,
    currentExerciseCount,
    expandWorkout,
    isWorkoutActive,
  } = useWorkoutStore(
    useShallow((state) => ({
      currentWorkoutTitle: selectActiveWorkoutTitle(state),
      currentExerciseCount: selectActiveWorkoutExerciseCount(state),
      expandWorkout: state.expandWorkout,
      isWorkoutActive: state.isWorkoutActive,
    })),
  );
  const {
    refreshPreview,
    nextRoutine,
    isStarting,
    startWorkoutFromSchedule,
    startFreeWorkout,
  } = useWorkoutStarter();
  const { capabilitiesByExerciseId, refresh: refreshExerciseCapabilities } =
    useExerciseCapabilities();
  const { allSessions, refresh: refreshHistory } = useHistoryAnalytics({
    includeSessionPage: false,
  });
  const [dashboardNow] = useState(() => Date.now());
  const dashboardMetrics = useMemo(
    () => buildDashboardMetrics(allSessions, { now: dashboardNow }),
    [allSessions, dashboardNow],
  );
  const weekCalendarDays = useMemo(
    () => buildWeekCalendarDays(allSessions, dashboardNow),
    [allSessions, dashboardNow],
  );
  const { goalViewModels } = useTrainingGoals(allSessions, {
    capabilitiesByExerciseId,
  });
  const { homePrimaryInsight, homeExerciseHighlights } =
    useIntelligenceOverview(allSessions, goalViewModels, {
      now: dashboardNow,
      capabilitiesByExerciseId,
    });

  const activeGoal = goalViewModels.find(
    (goalViewModel) => !goalViewModel.progress.isComplete,
  );
  const hasCurrentWorkout = isWorkoutActive && currentWorkoutTitle !== null;

  useFocusEffect(
    useCallback(() => {
      refreshPreview();
      refreshHistory();
      refreshExerciseCapabilities();
      return undefined;
    }, [refreshExerciseCapabilities, refreshHistory, refreshPreview]),
  );

  const handleStartScheduled = useCallback(async (): Promise<void> => {
    const sessionId = await startWorkoutFromSchedule();
    if (sessionId) {
      navigation.navigate('ActiveWorkout');
    }
  }, [navigation, startWorkoutFromSchedule]);

  const handleStartFree = useCallback(async (): Promise<void> => {
    const sessionId = await startFreeWorkout();
    if (sessionId) {
      navigation.navigate('ActiveWorkout');
    }
  }, [navigation, startFreeWorkout]);

  const handleContinueWorkout = (): void => {
    expandWorkout();
    navigation.navigate('ActiveWorkout');
  };

  const heroTitle = hasCurrentWorkout ? 'IN PROGRESS' : 'UP NEXT';
  const heroPrimary = hasCurrentWorkout
    ? currentWorkoutTitle
    : (nextRoutine?.routineName ?? 'Free workout');
  const heroSecondary = hasCurrentWorkout
    ? `${currentExerciseCount} exercises • Ready to finish`
    : nextRoutine
      ? `${nextRoutine.exerciseCount} exercises • ${nextRoutine.estimatedMinutes} min`
      : 'No schedule queued';
  const heroTertiary = hasCurrentWorkout
    ? 'Workout in progress'
    : nextRoutine
      ? nextRoutine.scheduleName
      : null;

  return (
    <Container edges={['left', 'right']} className="px-0">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        <View>
          <Meta>{heroTitle}</Meta>
          <DisplayHeading className="mt-5 text-7xl">
            {heroPrimary}
          </DisplayHeading>
          <Body className="mt-1 font-semibold">{heroSecondary}</Body>
          {heroTertiary ? <Muted className="mt-1">{heroTertiary}</Muted> : null}

          <View className="mt-4 gap-2">
            {hasCurrentWorkout ? (
              <Button onPress={handleContinueWorkout} className="w-full">
                Continue now
              </Button>
            ) : nextRoutine ? (
              <Button
                onPress={() => {
                  void handleStartScheduled();
                }}
                className="w-full"
                loading={isStarting}
                disabled={isStarting}
              >
                Start now
              </Button>
            ) : (
              <Button
                onPress={() => {
                  void handleStartFree();
                }}
                className="w-full"
                loading={isStarting}
                disabled={isStarting}
              >
                Start now
              </Button>
            )}

            {!hasCurrentWorkout && nextRoutine ? (
              <Button
                accessibilityLabel="Free workout"
                onPress={() => {
                  void handleStartFree();
                }}
                className="mt-2 self-start px-4 py-1 button-ghost"
                loading={isStarting}
                disabled={isStarting}
              >
                Free workout
              </Button>
            ) : null}
          </View>
        </View>

        <View className="mt-3 flex-1 rounded-[28px] py-5">
          <View className="gap-3">
            <View className="mt-2 flex-row justify-between gap-1.5">
              {weekCalendarDays.map((day) => (
                <DayTile
                  key={day.key}
                  accessibilityLabel={`${day.dayLabel} ${day.dateLabel}${day.hasWorkout ? ', workout completed' : ''}${day.isToday ? ', today' : ''}`}
                  className="flex-1"
                  outlined={day.isToday}
                  primaryLabel={day.dayLabel}
                  secondaryLabel={day.dateLabel}
                  tone={
                    day.hasWorkout
                      ? 'accent'
                      : day.isToday
                        ? 'subtle'
                        : 'default'
                  }
                />
              ))}
            </View>
            <View className="px-1 py-1">
              <Label>Insights</Label>
              <Body>{homePrimaryInsight.text}</Body>
            </View>

            <View className="flex-row gap-2.5">
              <Surface className="flex-1 rounded-[16px] bg-surface px-3 py-2.5">
                <Label>This week</Label>
                <Heading className="mt-1.5 text-3xl">
                  {dashboardMetrics.workoutsThisWeek}
                </Heading>
              </Surface>
              <Surface className="flex-1 rounded-[16px] bg-surface px-3 py-2.5">
                <Label>Streak</Label>
                <Heading className="mt-1.5 text-3xl">
                  {dashboardMetrics.currentWeeklyStreak}
                </Heading>
              </Surface>
              <Surface className="flex-1 rounded-[16px] bg-surface px-3 py-2.5">
                <Label>Active days</Label>
                <Heading className="mt-1.5 text-3xl">
                  {dashboardMetrics.workoutDaysThisWeek}
                </Heading>
              </Surface>
            </View>

            {homeExerciseHighlights.length > 0 ? (
              <Surface className="rounded-[22px] border border-surface-border/60 bg-surface px-4 py-4">
                <View className="flex-row items-center justify-between gap-3">
                  <Heading className="text-xl">Highlights</Heading>
                </View>
                <View className="mt-3 gap-2">
                  {homeExerciseHighlights.map((highlight) => (
                    <InteractivePressable
                      key={highlight.exerciseId}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${highlight.exerciseName} detail`}
                      className="rounded-[16px] bg-surface-elevated px-4 py-3"
                      onPress={() =>
                        navigation.navigate('ExerciseDetail', {
                          exerciseId: highlight.exerciseId,
                        })
                      }
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Body className="font-semibold">
                            {highlight.exerciseName}
                          </Body>
                          <Muted className="mt-1 text-sm">
                            {highlight.text}
                          </Muted>
                        </View>
                        <Heading className="text-lg">
                          {highlight.direction === 'up'
                            ? '↑'
                            : highlight.direction === 'down'
                              ? '↓'
                              : '→'}
                        </Heading>
                      </View>
                    </InteractivePressable>
                  ))}
                </View>
              </Surface>
            ) : null}

            {activeGoal && (
              <Card
                onPress={() =>
                  navigation.navigate('History', {
                    screen: 'Goals',
                  })
                }
              >
                <Body className="font-heading text-2xl leading-[28px]">
                  Goal
                </Body>
                <Label className="font-semibold mt-2">{activeGoal.title}</Label>
                <Body>{activeGoal.progress.progressText}</Body>
              </Card>
            )}
          </View>
        </View>
      </ScrollView>
      {isStarting ? (
        <View className="absolute inset-0 items-center justify-center bg-black/35">
          <View className="rounded-2xl border border-surface-border bg-surface-card px-5 py-4">
            <ActivityIndicator />
            <Body className="mt-2 font-medium">Starting workout...</Body>
          </View>
        </View>
      ) : null}
    </Container>
  );
}
