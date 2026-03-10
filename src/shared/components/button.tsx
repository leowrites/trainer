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
import { ActivityIndicator, Pressable, Text } from 'react-native';

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

// ── Style maps ────────────────────────────────────────────────────────────────

const containerVariant: Record<ButtonVariant, string> = {
  primary: 'bg-accent',
  secondary: 'bg-secondary',
  ghost: 'bg-surface-elevated',
  danger: 'bg-error',
};

const textVariant: Record<ButtonVariant, string> = {
  primary: 'text-black',
  secondary: 'text-black',
  ghost: 'text-muted',
  danger: 'text-white',
};

const containerSize: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 rounded',
  md: 'px-5 py-2.5 rounded-lg',
  lg: 'px-7 py-4 rounded-xl',
};

const textSize: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// ── Button ────────────────────────────────────────────────────────────────────

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

  // Spinner colour mirrors text colour
  const spinnerColour =
    variant === 'primary' || variant === 'secondary' ? '#000000' : '#ffffff';

  return (
    <Pressable
      className={`
        flex-row items-center justify-center
        ${containerVariant[variant]}
        ${containerSize[size]}
        ${className}
      `}
      style={({ pressed }) => ({
        opacity: !isInteractive ? 0.5 : pressed ? 0.75 : 1,
      })}
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !isInteractive }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={spinnerColour}
          accessibilityLabel="Loading"
        />
      ) : (
        <Text
          className={`font-semibold ${textVariant[variant]} ${textSize[size]}`}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
