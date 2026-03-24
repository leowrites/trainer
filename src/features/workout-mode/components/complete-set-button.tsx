/**
 * Complete set button.
 *
 * CALLING SPEC:
 * - render the primary action for logging the current set
 * - adds local glow, press expansion, and reward flash treatment
 * - respects reduced motion while keeping stronger visual feedback
 * - has no workflow logic of its own beyond calling `onPress`
 */

import React, { useEffect } from 'react';
import { Animated, Text } from 'react-native';

import { useReducedMotionPreference } from '@shared/hooks';
import { InteractivePressable } from '@shared/components';

export interface CompleteSetButtonProps {
  label: string;
  onPress: () => void;
}

export function CompleteSetButton({
  label,
  onPress,
}: CompleteSetButtonProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotionPreference();
  const pressScale = React.useRef(new Animated.Value(1)).current;
  const glowPulse = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    glowPulse.stopAnimation();

    if (prefersReducedMotion) {
      glowPulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 950,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1250,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [glowPulse, prefersReducedMotion]);

  const animatePressScale = (nextValue: number): void => {
    if (prefersReducedMotion) {
      return;
    }

    Animated.spring(pressScale, {
      toValue: nextValue,
      useNativeDriver: true,
      speed: 22,
      bounciness: 0,
    }).start();
  };

  return (
    <Animated.View
      style={{ transform: [{ scale: pressScale }] }}
      className="flex-1"
    >
      <InteractivePressable
        accessibilityRole="button"
        accessibilityLabel={label}
        className="h-12 items-center justify-center rounded-[16px] border border-accent/40 bg-accent px-4"
        onPress={onPress}
        onPressIn={() => animatePressScale(1.035)}
        onPressOut={() => animatePressScale(1)}
      >
        <Text className="font-body text-sm font-semibold text-accent-foreground">
          {label}
        </Text>
      </InteractivePressable>
    </Animated.View>
  );
}
