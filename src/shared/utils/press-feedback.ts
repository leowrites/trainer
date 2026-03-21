/**
 * Calling spec
 *
 * use when:
 * - a pressable surface should share the app's default tap feedback treatment
 * - layout changes should animate only when reduced motion is not preferred
 *
 * does:
 * - computes the shared opacity and scale treatment for pressed controls
 * - configures a lightweight layout animation for state changes
 *
 * does not:
 * - set per-component colors or borders
 * - bypass reduce-motion preferences
 */

import {
  LayoutAnimation,
  Platform,
  UIManager,
  type ViewStyle,
} from 'react-native';

export interface PressFeedbackOptions {
  pressed: boolean;
  prefersReducedMotion: boolean;
  pressedOpacity?: number;
  pressedScale?: number;
}

let hasEnabledAndroidLayoutAnimation = false;

export function getPressFeedbackStyle({
  pressed,
  prefersReducedMotion,
  pressedOpacity = 0.96,
  pressedScale = 0.985,
}: PressFeedbackOptions): ViewStyle {
  if (!pressed) {
    return {};
  }

  return {
    opacity: pressedOpacity,
    ...(prefersReducedMotion
      ? {}
      : {
          transform: [
            {
              scale: pressedScale,
            },
          ],
        }),
  };
}

export function configureInteractionLayoutAnimation(
  prefersReducedMotion: boolean,
): void {
  if (prefersReducedMotion) {
    return;
  }

  if (
    Platform.OS === 'android' &&
    !hasEnabledAndroidLayoutAnimation &&
    UIManager.setLayoutAnimationEnabledExperimental
  ) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
    hasEnabledAndroidLayoutAnimation = true;
  }

  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}
