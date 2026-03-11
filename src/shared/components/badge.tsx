/**
 * Badge
 *
 * A small interactive tag/label with semantic colour variants.
 * Mirrors the `.badge` CSS pattern from the design spec, including the
 * animated pulse dot for live/active states.
 *
 * Variants:
 * | variant    | Meaning                  | Accent colour |
 * |------------|--------------------------|---------------|
 * | `accent`   | positive / active        | lime `#c8f542` |
 * | `error`    | failure / plateau        | red `#f05a4f`  |
 * | `warning`  | caution / secondary      | amber `#f5a742`|
 * | `muted`    | inactive / neutral       | `#666666`      |
 *
 * Props:
 * - `variant`          — colour variant (default `accent`)
 * - `pulse`            — show an animated pulsing dot (default `false`)
 * - `children`         — badge text
 * - `onPress`          — makes the badge pressable
 * - `accessibilityLabel` — screen-reader label override
 * - `className`        — NativeWind overrides
 *
 * @example
 * ```tsx
 * <Badge variant="error" pulse>Plateau</Badge>
 * <Badge variant="warning" onPress={() => {}}>+5 lbs</Badge>
 * ```
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import type { ThemeTokens } from '@core/theme';
import { useTheme } from '@core/theme/theme-context';

export type BadgeVariant = 'accent' | 'error' | 'warning' | 'muted';

export interface BadgeProps {
  variant?: BadgeVariant;
  pulse?: boolean;
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
}

// ── Pulse dot ─────────────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }): React.JSX.Element {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      className="w-1.5 h-1.5 rounded-full"
      style={{ opacity, backgroundColor: color }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

// ── Variant token helper ──────────────────────────────────────────────────────

function resolveVariantStyles(
  variant: BadgeVariant,
  tokens: ThemeTokens,
): {
  containerStyle: object;
  textColor: string;
  dotColor: string;
} {
  switch (variant) {
    case 'error':
      return {
        containerStyle: {
          backgroundColor: tokens.errorSubtle,
          borderWidth: 1,
          borderColor: tokens.errorBorder,
        },
        textColor: tokens.error,
        dotColor: tokens.error,
      };
    case 'warning':
      return {
        containerStyle: {
          backgroundColor: tokens.secondarySubtle,
          borderWidth: 1,
          borderColor: tokens.secondaryBorder,
        },
        textColor: tokens.secondary,
        dotColor: tokens.secondary,
      };
    case 'muted':
      return {
        containerStyle: {
          backgroundColor: tokens.bgElevated,
          borderWidth: 1,
          borderColor: tokens.bgBorder,
        },
        textColor: tokens.textMuted,
        dotColor: tokens.textMuted,
      };
    default: // accent
      return {
        containerStyle: {
          backgroundColor: tokens.accentSubtle,
          borderWidth: 1,
          borderColor: tokens.accentBorder,
        },
        textColor: tokens.accent,
        dotColor: tokens.accent,
      };
  }
}

// ── Badge ─────────────────────────────────────────────────────────────────────

export function Badge({
  variant = 'accent',
  pulse = false,
  children,
  onPress,
  accessibilityLabel,
  className = '',
}: BadgeProps): React.JSX.Element {
  const { tokens } = useTheme();
  const { containerStyle, textColor, dotColor } = resolveVariantStyles(
    variant,
    tokens,
  );

  const inner = (
    <View
      className={`flex-row items-center gap-1 px-2 py-0.5 ${className}`}
      style={containerStyle}
    >
      {pulse ? <PulseDot color={dotColor} /> : null}
      <Text
        className="text-[10px] uppercase tracking-wider font-medium"
        style={{ color: textColor }}
      >
        {children}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View accessibilityRole="none" accessibilityLabel={accessibilityLabel}>
      {inner}
    </View>
  );
}
