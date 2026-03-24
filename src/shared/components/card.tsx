/**
 * Card
 *
 * A surface-card container with a border and consistent padding.
 * Optionally renders an uppercase label strip across the top (mirrors the
 * `.card-label` CSS pattern from the design spec).
 *
 * Props:
 * - `label`     — optional all-caps heading rendered above the content
 * - `children`  — card body content
 * - `className` — additional NativeWind class overrides
 * - `style`     — escape-hatch inline styles
 * - `onPress`   — when provided the card becomes pressable (Pressable wrapper)
 * - `accessibilityLabel` — override ARIA label (used when `onPress` is set)
 *
 * @example
 * ```tsx
 * <Card label="Today's Workout">
 *   <Text>Push A</Text>
 * </Card>
 * ```
 */

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import type { ViewProps } from 'react-native';

import { useReducedMotionPreference } from '@shared/hooks';
import { Box } from '@shared/ui/box';
import { Card as GluestackCard } from '@shared/ui/card';
import { Pressable } from '@shared/ui/pressable';
import { getPressFeedbackStyle } from '@shared/utils';
import { Label } from './typography';

export interface CardProps extends Pick<ViewProps, 'style'> {
  label?: string;
  children: React.ReactNode;
  className?: string;
  /** Makes the card interactive. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({
  label,
  children,
  className = '',
  style,
  onPress,
  accessibilityLabel,
}: CardProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotionPreference();
  const [pressed, setPressed] = useState(false);

  const renderContent = (): React.JSX.Element => (
    <Box pointerEvents={onPress ? 'box-none' : 'auto'}>
      {label !== undefined && label !== '' ? (
        <Box className="mb-5 flex-row items-center">
          <Box className="mr-2">
            <Label className="text-muted-foreground">{label}</Label>
          </Box>
          <Box className="h-px flex-1 bg-surface-border/70" />
        </Box>
      ) : null}
      {children}
    </Box>
  );

  const cardContent = (
    <GluestackCard
      className={`overflow-hidden rounded-[28px] border px-5 py-5 ${
        pressed
          ? 'border-surface-border/80 bg-surface-elevated'
          : 'border-surface-border/80 bg-surface-card'
      } ${className}`}
      style={[
        style,
        onPress
          ? getPressFeedbackStyle({
              pressed,
              prefersReducedMotion,
              pressedScale: 0.98,
            })
          : null,
      ]}
    >
      {onPress ? (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
        />
      ) : null}
      {renderContent()}
    </GluestackCard>
  );

  if (onPress) {
    return cardContent;
  }

  return <Box accessibilityRole="none">{cardContent}</Box>;
}
