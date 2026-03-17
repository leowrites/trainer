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

import React from 'react';
import type { ViewProps } from 'react-native';

import { Box } from '@shared/ui/box';
import { Card as GluestackCard } from '@shared/ui/card';
import { Pressable } from '@shared/ui/pressable';
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
  const content = (
    <GluestackCard
      className={`border border-surface-border bg-surface-card ${className}`}
      style={style}
    >
      {label !== undefined && label !== '' ? (
        <Box className="flex-row items-center mb-3">
          <Box className="mr-2">
            <Label>{label}</Label>
          </Box>
          <Box className="h-px flex-1 bg-surface-border" />
        </Box>
      ) : null}
      {children}
    </GluestackCard>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {content}
      </Pressable>
    );
  }

  return <Box accessibilityRole="none">{content}</Box>;
}
