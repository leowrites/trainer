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
import { Pressable, Text, View } from 'react-native';
import type { ViewProps } from 'react-native';

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
    <>
      {label !== undefined && label !== '' ? (
        <View className="flex-row items-center mb-3">
          <Text className="text-[10px] uppercase tracking-widest text-muted">
            {label}
          </Text>
          <View className="flex-1 h-px bg-surface-border ml-2" />
        </View>
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        className={`bg-surface-card border border-surface-border p-5 ${className}`}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      className={`bg-surface-card border border-surface-border p-5 ${className}`}
      style={style}
      accessibilityRole="none"
    >
      {content}
    </View>
  );
}
