import React, { useCallback } from 'react';
import { ActionSheetIOS, Alert, Platform, Text, View } from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import { Body, Heading, InteractivePressable, Muted } from '@shared/components';

export function ExerciseCard({
  title,
  exerciseId,
  previousPerformanceLabel,
  exerciseTimerDisplayLabel,
  isExerciseTimerActive,
  onOpenDetails,
  onDelete,
  onToggleExerciseTimer,
  children,
}: {
  title: string;
  exerciseId: string;
  previousPerformanceLabel: string;
  exerciseTimerDisplayLabel: string;
  isExerciseTimerActive: boolean;
  onOpenDetails: (exerciseId: string) => void;
  onDelete: () => void;
  onToggleExerciseTimer: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const { colorMode } = useTheme();

  const handleOpenOptions = useCallback((): void => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: ['View Details', 'Delete Exercise', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          userInterfaceStyle: colorMode,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            onOpenDetails(exerciseId);
          }

          if (buttonIndex === 1) {
            onDelete();
          }
        },
      );
      return;
    }

    Alert.alert(title, undefined, [
      {
        text: 'View Details',
        onPress: () => onOpenDetails(exerciseId),
      },
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Exercise',
        style: 'destructive',
        onPress: onDelete,
      },
    ]);
  }, [colorMode, exerciseId, onDelete, onOpenDetails, title]);

  return (
    <View className="mt-3 overflow-hidden rounded-[22px]  bg-surface-card p-4">
      <View className="relative border-b border-surface-border/80 pb-3">
        <View className="flex-row items-center justify-between gap-3">
          <InteractivePressable
            accessibilityRole="button"
            accessibilityLabel={`View details for ${title}`}
            className="flex-1"
            onPress={() => onOpenDetails(exerciseId)}
          >
            <Heading className="text-lg leading-[20px]">{title}</Heading>
          </InteractivePressable>
          <InteractivePressable
            accessibilityRole="button"
            accessibilityLabel={`Options for ${title}`}
            className="h-8 w-8 items-center justify-center rounded-[10px]  bg-surface-card"
            onPress={handleOpenOptions}
          >
            <Text className="font-mono text-sm tracking-[-1px] text-muted">
              ...
            </Text>
          </InteractivePressable>
        </View>
        <View className="mt-3 flex-row items-center justify-between gap-3">
          <Muted className="flex-1 text-sm">{previousPerformanceLabel}</Muted>
          <InteractivePressable
            accessibilityRole="button"
            accessibilityLabel={`${title} timer options`}
            accessibilityHint={`Choose the timer duration for ${title}. Current setting: ${exerciseTimerDisplayLabel}.`}
            className={`rounded-[12px] px-3 py-2 ${isExerciseTimerActive ? 'bg-secondary/10' : 'bg-surface-elevated'}`}
            onPress={onToggleExerciseTimer}
          >
            <Body
              className={`text-sm font-semibold ${
                isExerciseTimerActive ? 'text-secondary' : 'text-foreground'
              }`}
            >
              {exerciseTimerDisplayLabel}
            </Body>
          </InteractivePressable>
        </View>
      </View>
      {children}
    </View>
  );
}
