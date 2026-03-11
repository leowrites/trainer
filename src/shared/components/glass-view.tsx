/**
 * GlassView
 *
 * A platform-aware surface that renders iOS 26 "Liquid Glass" — a frosted,
 * translucent container — and degrades gracefully on older iOS versions and
 * Android.
 *
 * ## Rendering tiers
 *
 * | Tier                  | Condition          | Visual                        |
 * |-----------------------|--------------------|-------------------------------|
 * | **Liquid Glass**      | iOS 26+            | `rgba` fill + glass border    |
 * | **Glass (legacy iOS)**| iOS 13–25          | `rgba` fill + glass border    |
 * | **Solid fallback**    | Android / Web      | Opaque `glassFallback` fill   |
 *
 * > **Upgrading to native blur:** install `expo-blur` (`npx expo install
 * > expo-blur`) then replace the inner `View` with `BlurView` when
 * > `isLiquidGlass` is `true`.  The component's public API is unchanged.
 *
 * ## Props
 *
 * - `intensity`          — `'light' | 'medium' | 'heavy'` (default `'medium'`)
 * - `borderRadius`       — corner radius in logical pixels (default `16`)
 * - `children`           — content rendered inside the glass surface
 * - `className`          — additional NativeWind class overrides (layout only)
 * - `style`              — escape-hatch inline styles
 * - `accessibilityRole`  — ARIA role (default `'none'`)
 *
 * @example
 * ```tsx
 * <GlassView intensity="heavy" borderRadius={20}>
 *   <Text>Overlay content</Text>
 * </GlassView>
 * ```
 */

import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { useTheme } from '@core/theme/theme-context';

import { useGlassSupport } from '../hooks/use-glass-support';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Controls how opaque / heavy the glass fill appears. */
export type GlassIntensity = 'light' | 'medium' | 'heavy';

export interface GlassViewProps extends Pick<
  ViewProps,
  'style' | 'accessibilityRole'
> {
  /**
   * Controls opacity/depth of the glass fill.
   * @default 'medium'
   */
  intensity?: GlassIntensity;
  /**
   * Corner radius applied to the glass surface.
   * @default 16
   */
  borderRadius?: number;
  children?: React.ReactNode;
  /** NativeWind layout class overrides (e.g. `"flex-1 m-4"`). */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GlassView({
  intensity = 'medium',
  borderRadius = 16,
  children,
  className = '',
  style,
  accessibilityRole = 'none',
}: GlassViewProps): React.JSX.Element {
  const { tokens } = useTheme();
  const { isSupported } = useGlassSupport();

  const fill = isSupported
    ? {
        light: tokens.glassFillLight,
        medium: tokens.glassFillMedium,
        heavy: tokens.glassFillHeavy,
      }[intensity]
    : tokens.glassFallback;

  const borderColor = isSupported ? tokens.glassBorder : 'transparent';

  return (
    <View
      className={className}
      style={[
        {
          backgroundColor: fill,
          borderWidth: isSupported ? 1 : 0,
          borderColor,
          borderRadius,
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </View>
  );
}
