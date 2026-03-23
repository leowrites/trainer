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
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, View } from 'react-native';

import { useTheme } from '@core/theme/theme-context';
import { Body, Input, Label } from '@shared/components';
import { useReducedMotionPreference } from '@shared/hooks';
import { HeroValueZone } from './hero-value-zone';
import { buildHeroWheelOptions } from './focused-set-hero-helpers';
import { parseDecimalNumber } from '../utils/formatters';

export interface FocusedSetHeroProps {
  weightValue: number;
  repsValue: number;
  previousSetSummary: string;
  rewardToken: number;
  onPreviewWeight: (value: number) => void;
  onCommitWeight: (value: number) => void;
  onPreviewReps: (value: number) => void;
  onCommitReps: (value: number) => void;
}

export function FocusedSetHero({
  weightValue,
  repsValue,
  previousSetSummary,
  rewardToken,
  onPreviewWeight,
  onCommitWeight,
  onPreviewReps,
  onCommitReps,
}: FocusedSetHeroProps): React.JSX.Element {
  const { tokens } = useTheme();
  const prefersReducedMotion = useReducedMotionPreference();
  const heroScale = React.useRef(new Animated.Value(1)).current;
  const heroFlashOpacity = React.useRef(new Animated.Value(0)).current;
  const [weightText, setWeightText] = useState(String(weightValue));

  const weightOptions = useMemo(
    () => buildHeroWheelOptions(weightValue, 500, 5),
    [weightValue],
  );
  const repOptions = useMemo(
    () => buildHeroWheelOptions(repsValue, 30, 1),
    [repsValue],
  );

  useEffect(() => {
    setWeightText(String(weightValue));
  }, [weightValue]);

  useEffect(() => {
    if (rewardToken === 0) {
      return;
    }

    if (prefersReducedMotion) {
      heroFlashOpacity.setValue(0.18);
      Animated.timing(heroFlashOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.parallel([
      Animated.sequence([
        Animated.timing(heroScale, {
          toValue: 1.015,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(heroScale, {
          toValue: 1,
          duration: 130,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(heroFlashOpacity, {
          toValue: 0.28,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heroFlashOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [heroFlashOpacity, heroScale, prefersReducedMotion, rewardToken]);

  const commitWeightText = (): void => {
    const normalizedWeight = Math.max(0, parseDecimalNumber(weightText));

    setWeightText(String(normalizedWeight));
    onPreviewWeight(normalizedWeight);
    onCommitWeight(normalizedWeight);
  };

  return (
    <Animated.View
      style={{ transform: [{ scale: heroScale }] }}
      className="overflow-hidden py-10"
    >
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0 rounded-[30px] bg-accent"
        style={{ opacity: heroFlashOpacity }}
      />
      <Label className="text-accent text-xl">Current Set</Label>
      <View className="my-4 flex-row items-center justify-center gap-3">
        <HeroValueZone
          field="weight"
          value={weightValue}
          options={weightOptions}
          onPreviewValue={onPreviewWeight}
          onCommitValue={onCommitWeight}
        >
          <Input
            testID="hero-zone-weight-input"
            accessibilityLabel="Current set weight"
            className="mt-3 text-center text-lg"
            value={weightText}
            onChangeText={setWeightText}
            onEndEditing={commitWeightText}
            onSubmitEditing={commitWeightText}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </HeroValueZone>
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
    </Animated.View>
  );
}
