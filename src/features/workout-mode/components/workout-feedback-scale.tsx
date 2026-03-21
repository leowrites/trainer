/**
 * Workout feedback scale.
 *
 * CALLING SPEC:
 * - Renders the quick 1-5 selector used by the workout summary screen.
 * - `selectedValue` highlights the saved response.
 * - `onSelect(value)` is called immediately when the user taps an option.
 */

import React from 'react';
import { Pressable, View } from 'react-native';

import { Body, Caption, Label } from '@shared/components';
import type { WorkoutFeedbackOption } from '../summary-types';

export function WorkoutFeedbackScale({
  label,
  helperText,
  options,
  selectedValue,
  onSelect,
}: {
  label: string;
  helperText: string;
  options: WorkoutFeedbackOption[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
}): React.JSX.Element {
  return (
    <View className="gap-3">
      <View>
        <Label>{label}</Label>
        <Caption className="mt-2">{helperText}</Caption>
      </View>

      <View className="flex-row gap-2">
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${option.value} ${option.title}`}
              accessibilityState={{ selected: isSelected }}
              className={`min-h-20 flex-1 rounded-2xl border px-2 py-3 ${
                isSelected
                  ? 'border-accent bg-accent/15'
                  : 'border-surface-border bg-surface-elevated'
              }`}
              onPress={() => onSelect(option.value)}
            >
              <Body className="text-center font-semibold">
                {option.shortLabel}
              </Body>
              <Caption className="mt-2 text-center">{option.title}</Caption>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
