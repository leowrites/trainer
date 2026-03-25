/**
 * Workout summary screen.
 *
 * CALLING SPEC:
 * - Route name: `WorkoutSummary`
 * - Params: `{ sessionId: string }`
 * - Renders the completed-session debrief with earned badges, schedule
 *   context, completed exercises, and persisted effort/fatigue inputs.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@core/navigation';
import { useTheme } from '@core/theme/theme-context';
import {
  Badge,
  Body,
  Button,
  Caption,
  Container,
  DisplayHeading,
  Heading,
  Label,
  StatValue,
  Surface,
} from '@shared/components';
import { getWorkoutFeedbackOptions } from '../domain/workout-summary';
import { useWorkoutSummary } from '../hooks/use-workout-summary';
import { WorkoutFeedbackScale } from '../components/workout-feedback-scale';
import { WorkoutRecordBadgeCard } from '../components/workout-record-badge-card';

type WorkoutSummaryScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'WorkoutSummary'
>;

function formatExerciseSummary(
  completedSets: number,
  totalSets: number,
  totalReps: number,
): string {
  return `${completedSets}/${totalSets} sets • ${totalReps} reps`;
}

function formatVolume(value: number, unit: 'kg' | 'lb'): string {
  return `${new Intl.NumberFormat('en-CA', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)} ${unit}`;
}

export function WorkoutSummaryScreen({
  navigation,
  route,
}: WorkoutSummaryScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslate = useRef(new Animated.Value(20)).current;
  const { isLoading, summary, saveFeedback, applyTemplateUpdate } =
    useWorkoutSummary(route.params.sessionId);
  const [dismissedTemplatePrompt, setDismissedTemplatePrompt] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: '',
      headerTransparent: true,
      headerShadowVisible: false,
    });
  }, [navigation]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslate, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroOpacity, heroTranslate]);

  React.useEffect(() => {
    if (
      !summary?.templateUpdate?.canApply ||
      dismissedTemplatePrompt ||
      !applyTemplateUpdate
    ) {
      return;
    }

    Alert.alert(
      'Update routine template?',
      `Apply this completed workout back to ${summary.templateUpdate.routineName} so future sessions start from what you actually logged?`,
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => setDismissedTemplatePrompt(true),
        },
        {
          text: 'Apply',
          onPress: () => {
            setDismissedTemplatePrompt(true);
            applyTemplateUpdate();
          },
        },
      ],
      { cancelable: false },
    );
  }, [applyTemplateUpdate, dismissedTemplatePrompt, summary?.templateUpdate]);

  const handleBackToHome = (): void => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Tabs',
          params: { screen: 'Workout' },
        },
      ],
    });
  };

  if (isLoading || !summary) {
    return (
      <Container>
        <Heading>Loading summary</Heading>
        <Caption className="mt-3">
          Pulling the completed session from your local history.
        </Caption>
      </Container>
    );
  }

  return (
    <Container className="px-0 pb-0" edges={['left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
      >
        <Animated.View
          className="overflow-hidden rounded-3xl border border-surface-border bg-surface-card px-6 py-6"
          style={{
            opacity: heroOpacity,
            transform: [{ translateY: heroTranslate }],
          }}
        >
          <View
            className="absolute -right-10 -top-12 h-40 w-40 rounded-full"
            style={{ backgroundColor: `${tokens.accent}22` }}
          />
          <View
            className="absolute right-6 top-8 h-24 w-24 rounded-full border"
            style={{ borderColor: `${tokens.accent}55` }}
          />
          <Badge variant="accent" pulse>
            Workout Complete
          </Badge>
          <DisplayHeading className="mt-4 text-5xl leading-tight">
            {summary.session.routineName} logged.
          </DisplayHeading>
          <Body className="mt-4 max-w-sm text-muted">
            Finished at {summary.completedAtLabel} on {summary.dateLabel}.
            Everything below is pulled from your offline session history.
          </Body>

          <View className="mt-6 flex-row flex-wrap gap-3">
            <Surface className="min-w-36 flex-1 rounded-3xl bg-surface-elevated px-4 py-4">
              <Label>Duration</Label>
              <StatValue className="mt-3 text-3xl">
                {summary.durationLabel}
              </StatValue>
            </Surface>
            <Surface className="min-w-36 flex-1 rounded-3xl bg-surface-elevated px-4 py-4">
              <Label>Volume</Label>
              <StatValue className="mt-3 text-3xl">
                {summary.volumeLabel}
              </StatValue>
            </Surface>
            <Surface className="min-w-36 flex-1 rounded-3xl bg-surface-elevated px-4 py-4">
              <Label>Exercises</Label>
              <StatValue className="mt-3 text-3xl">
                {summary.session.exerciseCount}
              </StatValue>
            </Surface>
          </View>
        </Animated.View>

        <Surface className="rounded-3xl bg-surface-elevated px-5 py-5">
          <Label>Consistency</Label>
          <Heading className="mt-3">{summary.streakLabel}</Heading>
          <Caption className="mt-2">{summary.weeklyProgressLabel}</Caption>
        </Surface>

        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <Heading className="text-2xl">Earned badges</Heading>
            <Caption>
              {summary.recordBadges.length === 0
                ? 'No new records today'
                : `${summary.recordBadges.length} unlocked`}
            </Caption>
          </View>

          {summary.recordBadges.length > 0 ? (
            <View className="flex-row flex-wrap gap-3">
              {summary.recordBadges.map((badge) => (
                <WorkoutRecordBadgeCard key={badge.id} badge={badge} />
              ))}
            </View>
          ) : (
            <Surface className="rounded-3xl bg-surface-elevated px-5 py-5">
              <Body className="font-medium">
                Clean closeout. No fresh records this session.
              </Body>
              <Caption className="mt-2">
                The set history is still captured here so the next workout can
                push against it.
              </Caption>
            </Surface>
          )}
        </View>

        <View className="gap-3">
          <Heading className="text-2xl">Watchouts</Heading>
          {(summary.negativeSignals?.length ?? 0) > 0 ? (
            <View className="flex-row flex-wrap gap-3">
              {summary.negativeSignals?.map((badge) => (
                <WorkoutRecordBadgeCard key={badge.id} badge={badge} />
              ))}
            </View>
          ) : (
            <Surface className="rounded-3xl bg-surface-elevated px-5 py-5">
              <Body className="font-medium">
                No watchouts from this session.
              </Body>
              <Caption className="mt-2">
                Misses, overshot effort, fatigue flags, stalls, and plateaus
                will show up here when the intelligence engine detects them.
              </Caption>
            </Surface>
          )}
        </View>

        {(summary.prescriptions?.length ?? 0) > 0 ? (
          <View className="gap-3">
            <Heading className="text-2xl">Next Session</Heading>
            {summary.prescriptions?.map((prescription) => (
              <Surface
                key={prescription.exerciseId}
                className="rounded-3xl bg-surface-elevated px-5 py-5"
              >
                <Body className="font-medium">{prescription.exerciseName}</Body>
                <Caption className="mt-2">{prescription.reason}</Caption>
                <Caption className="mt-2">
                  {formatVolume(prescription.currentWeight, summary.unit)} to{' '}
                  {formatVolume(prescription.recommendedWeight, summary.unit)}
                </Caption>
              </Surface>
            ))}
          </View>
        ) : null}

        {(summary.goalDeltas?.length ?? 0) > 0 ? (
          <View className="gap-3">
            <Heading className="text-2xl">Goal Progress</Heading>
            {summary.goalDeltas?.map((goalDelta) => (
              <Surface
                key={goalDelta.id}
                className="rounded-3xl bg-surface-elevated px-5 py-5"
              >
                <Body className="font-medium">{goalDelta.title}</Body>
                <Caption className="mt-2">{goalDelta.progressText}</Caption>
                <Caption className="mt-2">
                  Confidence: {goalDelta.quality.level}
                </Caption>
              </Surface>
            ))}
          </View>
        ) : null}

        {summary.scheduleContext ? (
          <Surface className="rounded-3xl bg-surface-card px-5 py-5">
            <Label>Schedule</Label>
            <Heading className="mt-3">
              {summary.scheduleContext.scheduleName}
            </Heading>
            <Body className="mt-3">
              Completed {summary.scheduleContext.completedRoutineName} at slot{' '}
              {summary.scheduleContext.completedPositionLabel}.
            </Body>
            <Caption className="mt-2">
              {summary.scheduleContext.nextRoutineName
                ? `Next up: ${summary.scheduleContext.nextRoutineName}`
                : 'No next routine is queued yet.'}
            </Caption>
          </Surface>
        ) : null}

        <View className="gap-3">
          <Heading className="text-2xl">Completed exercises</Heading>
          {summary.session.exercises.map((exercise) => (
            <Surface
              key={exercise.exerciseId}
              className="rounded-3xl bg-surface-elevated px-5 py-5"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Body className="font-medium">{exercise.exerciseName}</Body>
                  <Caption className="mt-2">
                    {formatExerciseSummary(
                      exercise.completedSets,
                      exercise.totalSets,
                      exercise.totalReps,
                    )}
                  </Caption>
                </View>
                <Body className="font-medium">
                  {formatVolume(exercise.totalVolume, summary.unit)}
                </Body>
              </View>
            </Surface>
          ))}
        </View>

        <Surface className="rounded-3xl bg-surface-card px-5 py-5">
          <Heading className="text-2xl">Recovery check-in</Heading>
          <Caption className="mt-2">
            Save the session feel while it is still fresh.
          </Caption>

          <View className="mt-5 gap-5">
            <WorkoutFeedbackScale
              label="Effort level"
              helperText="How hard did the whole session feel?"
              options={getWorkoutFeedbackOptions('effort')}
              selectedValue={summary.effortLevel}
              onSelect={(value) => saveFeedback('effort', value)}
            />
            <WorkoutFeedbackScale
              label="Fatigue"
              helperText="How cooked are you walking out?"
              options={getWorkoutFeedbackOptions('fatigue')}
              selectedValue={summary.fatigueLevel}
              onSelect={(value) => saveFeedback('fatigue', value)}
            />
          </View>
        </Surface>

        <Surface className="rounded-3xl bg-surface-elevated px-5 py-5">
          <Label>Next move</Label>
          <Heading className="mt-3 text-2xl">
            {summary.scheduleContext?.nextRoutineName
              ? `Back home for ${summary.scheduleContext.nextRoutineName}`
              : 'Back home and reset for the next session'}
          </Heading>
          <Caption className="mt-2">
            Close the debrief and jump back into your training loop.
          </Caption>
        </Surface>

        <Button onPress={handleBackToHome} className="w-full">
          Return Home
        </Button>
      </ScrollView>
    </Container>
  );
}
