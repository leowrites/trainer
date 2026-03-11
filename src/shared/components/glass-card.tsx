/**
 * GlassCard
 *
 * A liquid-glass variant of `Card`.  Replaces the opaque surface background
 * with a frosted, translucent `GlassView` while preserving the same content
 * and label-strip API as the standard `Card`.
 *
 * On Android / Web the card degrades to a solid semi-opaque surface so the
 * layout and content remain identical across platforms.
 *
 * Props:
 * - `label`       — optional all-caps heading rendered above the content
 * - `intensity`   — `'light' | 'medium' | 'heavy'` glass fill (default `'medium'`)
 * - `borderRadius`— corner radius in logical pixels (default `16`)
 * - `children`    — card body content
 * - `className`   — additional NativeWind class overrides
 * - `style`       — escape-hatch inline styles
 * - `onPress`     — when provided the card becomes pressable
 * - `accessibilityLabel` — override ARIA label (used when `onPress` is set)
 *
 * @example
 * ```tsx
 * <GlassCard label="Today's Workout" intensity="heavy">
 *   <Text>Push A</Text>
 * </GlassCard>
 * ```
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ViewProps } from 'react-native';

import { useTheme } from '@core/theme/theme-context';

import type { GlassIntensity } from './glass-view';
import { GlassView } from './glass-view';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GlassCardProps extends Pick<ViewProps, 'style'> {
  label?: string;
  /**
   * Controls the opacity/depth of the glass fill.
   * @default 'medium'
   */
  intensity?: GlassIntensity;
  /**
   * Corner radius applied to the card surface.
   * @default 16
   */
  borderRadius?: number;
  children: React.ReactNode;
  className?: string;
  /** Makes the card interactive. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GlassCard({
  label,
  intensity = 'medium',
  borderRadius = 16,
  children,
  className = '',
  style,
  onPress,
  accessibilityLabel,
}: GlassCardProps): React.JSX.Element {
  const { tokens } = useTheme();

  const labelStrip =
    label !== undefined && label !== '' ? (
      <View className="flex-row items-center mb-3">
        <Text
          className="text-[10px] uppercase tracking-widest"
          style={{ color: tokens.textMuted }}
        >
          {label}
        </Text>
        <View
          className="flex-1 h-px ml-2"
          style={{ backgroundColor: tokens.glassBorder }}
        />
      </View>
    ) : null;

  const innerContent = (
    <>
      {labelStrip}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}
      >
        <GlassView
          intensity={intensity}
          borderRadius={borderRadius}
          className={`p-5 ${className}`}
        >
          {innerContent}
        </GlassView>
      </Pressable>
    );
  }

  return (
    <GlassView
      intensity={intensity}
      borderRadius={borderRadius}
      className={`p-5 ${className}`}
      style={style}
      accessibilityRole="none"
    >
      {innerContent}
    </GlassView>
  );
}
