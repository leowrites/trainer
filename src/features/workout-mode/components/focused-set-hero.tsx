/**
 * Focused set hero.
 *
 * CALLING SPEC:
 * - render the active workout hero with split weight and reps edit zones
 * - renders always-on weight and reps wheels with a strong centered focus
 * - previews wheel changes immediately and commits settled values upstream
 * - owns success highlight treatment only
 * - has no persistence side effects on its own
 */

import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import { Body, Label } from '@shared/components';
import { HeroValueZone } from './hero-value-zone';
import { buildHeroWheelOptions } from './focused-set-hero-helpers';

export interface FocusedSetHeroProps {
  weightValue: number;
  repsValue: number;
  previousSetSummary: string;
  onPreviewWeight: (value: number) => void;
  onCommitWeight: (value: number) => void;
  onPreviewReps: (value: number) => void;
  onCommitReps: (value: number) => void;
}

export const FocusedSetHero = React.memo(function FocusedSetHero({
  weightValue,
  repsValue,
  previousSetSummary,
  onPreviewWeight,
  onCommitWeight,
  onPreviewReps,
  onCommitReps,
}: FocusedSetHeroProps): React.JSX.Element {
  const { tokens } = useTheme();

  const weightOptions = useMemo(
    () => buildHeroWheelOptions(weightValue, 500, 5),
    [weightValue],
  );
  const repOptions = useMemo(
    () => buildHeroWheelOptions(repsValue, 30, 1),
    [repsValue],
  );

  return (
    <View className="overflow-hidden py-10">
      <Label className="text-accent text-xl">Current Set</Label>
      <View className="my-4 flex-row items-center justify-center gap-3">
        <HeroValueZone
          field="weight"
          value={weightValue}
          options={weightOptions}
          onPreviewValue={onPreviewWeight}
          onCommitValue={onCommitWeight}
        />
        <View
          accessible={false}
          className="h-11 w-11 items-center justify-center rounded-full"
        >
          <Feather name="x" size={30} color={tokens.accent} />
        </View>
        <HeroValueZone
          field="reps"
          value={repsValue}
          options={repOptions}
          onPreviewValue={onPreviewReps}
          onCommitValue={onCommitReps}
        />
      </View>

      <Body className="font-semibold">{previousSetSummary}</Body>
    </View>
  );
});
