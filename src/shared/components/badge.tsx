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
import { Animated, Pressable, View } from 'react-native';

import { Badge as GluestackBadge, BadgeText } from '@shared/ui/badge';

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

function resolveVariantProps(variant: BadgeVariant): {
  action: 'success' | 'error' | 'warning' | 'muted';
  dotColor: string;
} {
  switch (variant) {
    case 'error':
      return { action: 'error', dotColor: '#f05a4f' };
    case 'warning':
      return { action: 'warning', dotColor: '#f5a742' };
    case 'muted':
      return { action: 'muted', dotColor: '#666666' };
    default: // accent
      return { action: 'success', dotColor: '#c8f542' };
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
  const { action, dotColor } = resolveVariantProps(variant);

  const inner = (
    <GluestackBadge
      action={action}
      variant="outline"
      size="md"
      className={className}
    >
      {pulse ? <PulseDot color={dotColor} /> : null}
      <BadgeText>{children}</BadgeText>
    </GluestackBadge>
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
