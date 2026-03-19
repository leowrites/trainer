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
import type { PressableStateCallbackType, ViewProps } from 'react-native';

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
  const renderContent = (pressed: boolean): React.JSX.Element => (
    <GluestackCard
      className={`rounded-[28px] px-5 py-5 ${
        pressed
          ? 'border-accent/60 bg-surface-elevated'
          : 'border-surface-border/80 bg-surface-card'
      } ${className}`}
      style={style}
    >
      {label !== undefined && label !== '' ? (
        <Box className="mb-5 flex-row items-center">
          <Box className="mr-2">
            <Label className="text-muted-foreground">{label}</Label>
          </Box>
          <Box className="h-px flex-1 bg-surface-border/70" />
        </Box>
      ) : null}
      {children}
    </GluestackCard>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }: PressableStateCallbackType) => [
          {
            opacity: pressed ? 0.96 : 1,
            transform: [{ scale: pressed ? 0.975 : 1 }],
          },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {({ pressed }: PressableStateCallbackType) => renderContent(pressed)}
      </Pressable>
    );
  }

  return <Box accessibilityRole="none">{renderContent(false)}</Box>;
}
