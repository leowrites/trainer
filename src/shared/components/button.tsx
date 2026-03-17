/**
 * Button
 *
 * A fully accessible, multi-variant pressable button primitive.
 *
 * Variants:
 * | variant     | Background       | Text colour   | Use case         |
 * |-------------|-----------------|---------------|------------------|
 * | `primary`   | accent lime      | black         | Main CTA         |
 * | `secondary` | secondary amber  | black         | Secondary action |
 * | `ghost`     | elevated surface | muted text    | Tertiary action  |
 * | `danger`    | error red        | white         | Destructive      |
 *
 * Sizes:
 * | size | Padding          | Font size |
 * |------|-----------------|-----------|
 * | `sm` | px-3 py-1.5      | 12px      |
 * | `md` | px-5 py-2.5      | 14px (default) |
 * | `lg` | px-7 py-4        | 16px      |
 *
 * Props:
 * - `variant`          — colour / style variant (default `primary`)
 * - `size`             — size preset (default `md`)
 * - `disabled`         — disables interaction and applies reduced opacity
 * - `loading`          — shows an `ActivityIndicator` in place of children
 * - `onPress`          — tap handler
 * - `children`         — button label (rendered as `Text`)
 * - `className`        — NativeWind overrides on the outer `Pressable`
 * - `accessibilityLabel` — screen-reader label override
 *
 * @example
 * ```tsx
 * <Button onPress={handleStart}>Start Workout</Button>
 * <Button variant="danger" size="sm" onPress={handleDelete}>Delete</Button>
 * ```
 */

import React from 'react';

import {
  Button as GluestackButton,
  ButtonSpinner,
  ButtonText,
} from '@shared/ui/button';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  className?: string;
  accessibilityLabel?: string;
}

function resolveVariantProps(variant: ButtonVariant): {
  action: 'primary' | 'secondary' | 'negative' | 'default';
  gluestackVariant: 'solid' | 'outline' | 'link';
} {
  switch (variant) {
    case 'secondary':
      return { action: 'secondary', gluestackVariant: 'solid' };
    case 'ghost':
      return { action: 'default', gluestackVariant: 'outline' };
    case 'danger':
      return { action: 'negative', gluestackVariant: 'solid' };
    default: // primary
      return { action: 'primary', gluestackVariant: 'solid' };
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onPress,
  children,
  className = '',
  accessibilityLabel,
}: ButtonProps): React.JSX.Element {
  const isInteractive = !disabled && !loading;
  const { action, gluestackVariant } = resolveVariantProps(variant);

  return (
    <GluestackButton
      action={action}
      variant={gluestackVariant}
      size={size}
      className={className}
      onPress={isInteractive ? onPress : undefined}
      isDisabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !isInteractive }}
    >
      {loading ? (
        <ButtonSpinner accessibilityLabel="Loading" />
      ) : (
        <ButtonText>{children}</ButtonText>
      )}
    </GluestackButton>
  );
}
