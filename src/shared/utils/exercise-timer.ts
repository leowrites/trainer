/**
 * Calling spec
 *
 * use when:
 * - an exercise-level timer preset must be displayed or edited
 * - multiple features need the same timer preset menu semantics
 *
 * does:
 * - provides the shared timer preset list and default duration
 * - formats preset durations into the app's `m:ss` display style
 * - opens the same platform-specific timer picker on iOS and Android
 *
 * does not:
 * - start, stop, or persist any timers by itself
 * - assume whether clearing means "stop timer" or "use default"
 */

import { ActionSheetIOS, Alert, Platform } from 'react-native';

export const DEFAULT_EXERCISE_TIMER_SECONDS = 60;
export const EXERCISE_TIMER_OPTIONS = [30, 60, 90, 120] as const;

export interface ExerciseTimerPickerConfig {
  title: string;
  message: string;
  currentDurationSeconds?: number | null;
  colorMode?: 'light' | 'dark';
  onSelectDuration: (seconds: number) => void;
  onClear?: () => void;
  clearActionLabel?: string;
  clearActionStyle?: 'default' | 'destructive';
}

function formatSecondsClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatTimerDuration(seconds: number): string {
  return formatSecondsClock(seconds);
}

export function showExerciseTimerPicker({
  title,
  message,
  currentDurationSeconds = null,
  colorMode,
  onSelectDuration,
  onClear,
  clearActionLabel = 'Clear Timer',
  clearActionStyle = 'destructive',
}: ExerciseTimerPickerConfig): void {
  if (Platform.OS === 'ios') {
    const durationOptions = EXERCISE_TIMER_OPTIONS.map(
      (seconds) =>
        `${seconds} sec${seconds === currentDurationSeconds ? ' ✓' : ''}`,
    );
    const options = onClear
      ? [...durationOptions, clearActionLabel, 'Cancel']
      : [...durationOptions, 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    const clearButtonIndex = onClear ? options.length - 2 : -1;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options,
        cancelButtonIndex,
        destructiveButtonIndex:
          onClear && clearActionStyle === 'destructive'
            ? clearButtonIndex
            : undefined,
        userInterfaceStyle: colorMode,
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex) {
          return;
        }

        if (onClear && buttonIndex === clearButtonIndex) {
          onClear();
          return;
        }

        const nextDuration = EXERCISE_TIMER_OPTIONS[buttonIndex];
        if (nextDuration !== undefined) {
          onSelectDuration(nextDuration);
        }
      },
    );
    return;
  }

  Alert.alert(title, message, [
    ...EXERCISE_TIMER_OPTIONS.map((seconds) => ({
      text: `${seconds} sec`,
      onPress: () => onSelectDuration(seconds),
    })),
    ...(onClear
      ? [
          {
            text: clearActionLabel,
            style:
              clearActionStyle === 'destructive' ? 'destructive' : 'default',
            onPress: onClear,
          } as const,
        ]
      : []),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
