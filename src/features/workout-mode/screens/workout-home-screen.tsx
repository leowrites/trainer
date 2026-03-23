import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import type { RootStackParamList, RootTabParamList } from '@core/navigation';
import {
  buildDashboardMetrics,
  type HistorySession,
  useHistoryAnalytics,
} from '@features/analytics';
import {
  useIntelligenceOverview,
  useTrainingGoals,
} from '@features/intelligence';
import {
  Body,
  Button,
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
import { useWorkoutStore } from '../store';

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
      currentWorkoutTitle: state.activeSession?.title ?? null,
      currentExerciseCount: state.activeSession?.exercises.length ?? 0,
      expandWorkout: state.expandWorkout,
      isWorkoutActive: state.isWorkoutActive,
    })),
  );
  const {
    refreshPreview,
    nextRoutine,
    startWorkoutFromSchedule,
    startFreeWorkout,
  } = useWorkoutStarter();
  const { allSessions, refresh: refreshHistory } = useHistoryAnalytics();
  const [starting, setStarting] = useState(false);
  const [dashboardNow] = useState(() => Date.now());
  const dashboardMetrics = useMemo(
    () => buildDashboardMetrics(allSessions, { now: dashboardNow }),
    [allSessions, dashboardNow],
  );
  const weekCalendarDays = useMemo(
    () => buildWeekCalendarDays(allSessions, dashboardNow),
    [allSessions, dashboardNow],
  );
  const { goalViewModels } = useTrainingGoals(allSessions);
  const { homePrimaryInsight, homeExerciseHighlights } =
    useIntelligenceOverview(allSessions, goalViewModels, {
      now: dashboardNow,
    });

  const activeGoal = goalViewModels.find(
    (goalViewModel) => !goalViewModel.progress.isComplete,
  );
  const hasCurrentWorkout = isWorkoutActive && currentWorkoutTitle !== null;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshPreview();
      refreshHistory();
    });

    return unsubscribe;
  }, [navigation, refreshHistory, refreshPreview]);

  const handleStartScheduled = (): void => {
    if (starting) {
      return;
    }

    setStarting(true);

    try {
      const sessionId = startWorkoutFromSchedule();
      if (sessionId) {
        navigation.navigate('ActiveWorkout');
      }
    } finally {
      setStarting(false);
    }
  };

  const handleStartFree = (): void => {
    if (starting) {
      return;
    }

    setStarting(true);

    try {
      startFreeWorkout();
      navigation.navigate('ActiveWorkout');
    } finally {
      setStarting(false);
    }
  };

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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 0 }}
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
                onPress={handleStartScheduled}
                disabled={starting}
                loading={starting}
                className="w-full"
              >
                Start now
              </Button>
            ) : (
              <Button
                onPress={handleStartFree}
                disabled={starting}
                loading={starting}
                className="w-full"
              >
                Start now
              </Button>
            )}

            {!hasCurrentWorkout && nextRoutine ? (
              <Button
                accessibilityLabel="Free workout"
                onPress={handleStartFree}
                className="mt-2 self-start px-4 py-1 button-ghost"
              >
                Free workout
              </Button>
            ) : null}
          </View>
        </View>

        <View className="mt-3 flex-1 rounded-[28px] py-5">
          <View className="gap-3">
            <View className="px-1 py-1">
              <Heading>Insights</Heading>
              <Body>{homePrimaryInsight.text}</Body>
            </View>

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

            {activeGoal ? (
              <InteractivePressable
                accessibilityRole="button"
                accessibilityLabel="Open goals"
                className="rounded-[22px] border border-surface-border/60 bg-surface px-4 py-4"
                onPress={() =>
                  navigation.navigate('History', {
                    screen: 'Goals',
                  })
                }
              >
                <Heading className="text-xl">Goal</Heading>
                <Body className="mt-3 font-semibold">{activeGoal.title}</Body>
                <Muted className="mt-2">
                  {activeGoal.progress.progressText}
                </Muted>
              </InteractivePressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}
