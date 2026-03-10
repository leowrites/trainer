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

function PulseDot({ variant }: { variant: BadgeVariant }): React.JSX.Element {
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

  const dotColourClass =
    variant === 'error'
      ? 'bg-error'
      : variant === 'warning'
        ? 'bg-secondary'
        : variant === 'muted'
          ? 'bg-muted'
          : 'bg-accent';

  return (
    <Animated.View
      className={`w-1.5 h-1.5 rounded-full ${dotColourClass}`}
      style={{ opacity }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

// ── Variant styles ────────────────────────────────────────────────────────────

const variantStyles: Record<BadgeVariant, { container: string; text: string }> =
  {
    accent: {
      container: 'bg-accent-subtle border border-accent-border',
      text: 'text-accent',
    },
    error: {
      container: 'bg-error-subtle border border-error-border',
      text: 'text-error',
    },
    warning: {
      container: 'bg-secondary-subtle border border-secondary-border',
      text: 'text-secondary',
    },
    muted: {
      container: 'bg-surface-elevated border border-surface-border',
      text: 'text-muted',
    },
  };

// ── Badge ─────────────────────────────────────────────────────────────────────

export function Badge({
  variant = 'accent',
  pulse = false,
  children,
  onPress,
  accessibilityLabel,
  className = '',
}: BadgeProps): React.JSX.Element {
  const { container, text } = variantStyles[variant];

  const inner = (
    <View
      className={`flex-row items-center gap-1 px-2 py-0.5 ${container} ${className}`}
    >
      {pulse ? <PulseDot variant={variant} /> : null}
      <Text
        className={`text-[10px] uppercase tracking-wider font-medium ${text}`}
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
