/**
 * Typography
 *
 * A set of pre-styled `Text` primitives that map the design system's type scale
 * to semantic, accessible React Native components.
 *
 * | Component   | Role                | Size  | Weight    |
 * |-------------|---------------------|-------|-----------|
 * | `Heading`   | Screen / section title | xl  | bold      |
 * | `Body`      | Default body copy   | sm    | regular   |
 * | `Label`     | Card / field label  | xs    | regular   |
 * | `Caption`   | Timestamp / sub-info | xs   | regular   |
 * | `Muted`     | De-emphasised text  | sm    | regular   |
 * | `StatValue` | Large metric display | 4xl  | bold      |
 *
 * Props (all variants):
 * - `children`   — text content
 * - `className`  — additional NativeWind class overrides
 * - `numberOfLines` — truncation hint
 * - `accessibilityRole` — override the inferred ARIA role
 *
 * @example
 * ```tsx
 * <Heading>Workout Summary</Heading>
 * <Body>Track your progress over time.</Body>
 * <StatValue>142 <Caption>kg</Caption></StatValue>
 * ```
 */

import React from 'react';
import { Text } from 'react-native';
import type { TextProps } from 'react-native';

import { useTheme } from '@core/theme/theme-context';

interface TypographyProps extends Pick<
  TextProps,
  'numberOfLines' | 'accessibilityRole' | 'accessibilityLabel'
> {
  children: React.ReactNode;
  className?: string;
}

// ─── Heading ──────────────────────────────────────────────────────────────────

/**
 * Large display heading — used for screen titles and card headings.
 * Maps to `font-size: 24px, font-weight: 700` in the design spec.
 */
export function Heading({
  children,
  className = '',
  numberOfLines,
  accessibilityRole = 'header',
  accessibilityLabel,
}: TypographyProps): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <Text
      className={`text-2xl font-bold ${className}`}
      style={{ color: tokens.textPrimary }}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Text>
  );
}

// ─── Body ─────────────────────────────────────────────────────────────────────

/**
 * Default body text — `13px` regular (matches `--font-size: 13px` in the design spec).
 */
export function Body({
  children,
  className = '',
  numberOfLines,
  accessibilityRole = 'text',
  accessibilityLabel,
}: TypographyProps): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <Text
      className={`text-[13px] leading-relaxed ${className}`}
      style={{ color: tokens.textPrimary }}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Text>
  );
}

// ─── Label ────────────────────────────────────────────────────────────────────

/**
 * Card / section label — `10px`, uppercase, wide letter-spacing.
 * Mirrors the `.card-label` CSS rule from the design spec.
 */
export function Label({
  children,
  className = '',
  numberOfLines,
  accessibilityRole = 'text',
  accessibilityLabel,
}: TypographyProps): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <Text
      className={`text-[10px] uppercase tracking-widest ${className}`}
      style={{ color: tokens.textMuted }}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Text>
  );
}

// ─── Caption ─────────────────────────────────────────────────────────────────

/**
 * Caption / meta text — `10px` muted.
 */
export function Caption({
  children,
  className = '',
  numberOfLines,
  accessibilityRole = 'text',
  accessibilityLabel,
}: TypographyProps): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <Text
      className={`text-[10px] ${className}`}
      style={{ color: tokens.textMuted }}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Text>
  );
}

// ─── Muted ────────────────────────────────────────────────────────────────────

/**
 * De-emphasised body text — `13px` (same size as `Body`) but coloured with the
 * muted token.
 */
export function Muted({
  children,
  className = '',
  numberOfLines,
  accessibilityRole = 'text',
  accessibilityLabel,
}: TypographyProps): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <Text
      className={`text-[13px] ${className}`}
      style={{ color: tokens.textMuted }}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Text>
  );
}

// ─── StatValue ────────────────────────────────────────────────────────────────

/**
 * Large metric / stat value — maps to `.stat-value` in the design spec.
 * Always renders at `42px` bold; pass `className` to override the size
 * (e.g. `className="text-[32px]"` for a smaller layout slot).
 */
export function StatValue({
  children,
  className = '',
  numberOfLines,
  accessibilityRole = 'text',
  accessibilityLabel,
}: TypographyProps): React.JSX.Element {
  const { tokens } = useTheme();
  return (
    <Text
      className={`text-[42px] font-bold leading-none ${className}`}
      style={{ color: tokens.textPrimary }}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Text>
  );
}
