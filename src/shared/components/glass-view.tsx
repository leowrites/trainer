/**
 * GlassView
 *
 * A platform-aware surface backed by `@callstack/liquid-glass`.  On iOS 26+
 * it renders native liquid glass via `LiquidGlassView`; on older iOS it falls
 * back to an `rgba` approximation; on Android / Web it uses a solid
 * `glassFallback` fill.
 *
 * ## Rendering tiers
 *
 * | Tier                  | Condition          | Visual                                |
 * |-----------------------|--------------------|---------------------------------------|
 * | **Liquid Glass**      | iOS 26+            | Native `LiquidGlassView` (real blur)  |
 * | **Glass (legacy iOS)**| iOS 13–25          | `rgba` fill + glass border            |
 * | **Solid fallback**    | Android / Web      | Opaque `glassFallback` fill           |
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
import type { ViewProps } from 'react-native';

import {
  isLiquidGlassSupported,
  LiquidGlassView,
} from '@callstack/liquid-glass';

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

// ─── Intensity maps ───────────────────────────────────────────────────────────

// `medium` and `heavy` both use the 'regular' blur material; the visual
// distinction between them on iOS 26+ comes from the tintColor overlay
// applied to the 'heavy' tier (see GlassView render below).
const EFFECT_MAP = {
  light: 'clear',
  medium: 'regular',
  heavy: 'regular',
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function GlassView({
  intensity = 'medium',
  borderRadius = 16,
  children,
  className = '',
  style,
  accessibilityRole = 'none',
}: GlassViewProps): React.JSX.Element {
  const { tokens, colorMode } = useTheme();
  const { isSupported } = useGlassSupport();

  // On iOS 26+ the native module handles the visual; we only supply the
  // effect variant and an optional tint for the heavy tier.  colorScheme
  // mirrors the active theme so glass adapts to light/dark mode.
  if (isLiquidGlassSupported) {
    return (
      <LiquidGlassView
        effect={EFFECT_MAP[intensity]}
        tintColor={intensity === 'heavy' ? tokens.glassFillHeavy : undefined}
        colorScheme={colorMode}
        className={className}
        style={[{ borderRadius, overflow: 'hidden' }, style]}
        accessibilityRole={accessibilityRole}
      >
        {children}
      </LiquidGlassView>
    );
  }

  // iOS < 26: rgba approximation with a subtle glass border.
  // Android / Web: solid opaque fallback.
  const fill = isSupported
    ? {
        light: tokens.glassFillLight,
        medium: tokens.glassFillMedium,
        heavy: tokens.glassFillHeavy,
      }[intensity]
    : tokens.glassFallback;

  const borderColor = isSupported ? tokens.glassBorder : 'transparent';

  return (
    <LiquidGlassView
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
    </LiquidGlassView>
  );
}
