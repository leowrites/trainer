/**
 * Calling spec
 *
 * use when:
 * - a raw pressable control needs the app's default tap feedback
 * - a feature screen should avoid hand-rolling pressed opacity/scale logic
 *
 * does:
 * - wraps `Pressable` with shared opacity and scale feedback
 * - preserves the caller's existing className, accessibility, and custom styles
 *
 * does not:
 * - inject colors or layout by itself
 * - manage tactile feedback
 */

import React from 'react';
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotionPreference } from '@shared/hooks';
import { getPressFeedbackStyle } from '@shared/utils';

export interface InteractivePressableProps extends PressableProps {
  pressedOpacity?: number;
  pressedScale?: number;
}

function resolveBaseStyle(
  style:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>)
    | undefined,
  state: PressableStateCallbackType,
): StyleProp<ViewStyle> {
  if (typeof style === 'function') {
    return style(state);
  }

  return style;
}

export function InteractivePressable({
  style,
  pressedOpacity,
  pressedScale,
  ...props
}: InteractivePressableProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotionPreference();

  return (
    <Pressable
      {...props}
      style={(state) => [
        resolveBaseStyle(style, state),
        getPressFeedbackStyle({
          pressed: state.pressed,
          prefersReducedMotion,
          pressedOpacity,
          pressedScale,
        }),
      ]}
    />
  );
}
