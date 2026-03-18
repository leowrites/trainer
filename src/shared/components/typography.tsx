/**
 * Typography
 *
 * A set of pre-styled `Text` primitives that map the design system's type scale
 * to semantic, accessible React Native components.
 *
 * | Component   | Role                | Size  | Weight    |
 * |-------------|---------------------|-------|-----------|
 * | `DisplayHeading` | Editorial hero / large title | custom | bold |
 * | `Heading`        | Screen / section title | xl  | bold      |
 * | `Body`           | Default body copy   | sm    | regular   |
 * | `Label`          | Card / field label  | xs    | regular   |
 * | `Caption`        | Timestamp / sub-info | xs   | regular   |
 * | `Meta`           | Compact mono utility copy | 2xs | regular |
 * | `Muted`          | De-emphasised text  | sm    | regular   |
 * | `StatValue`      | Large metric display | 4xl  | bold      |
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
import type { TextProps } from 'react-native';

import { Heading as GluestackHeading } from '@shared/ui/heading';
import { Text as GluestackText } from '@shared/ui/text';

interface TypographyProps extends Pick<
  TextProps,
  'numberOfLines' | 'accessibilityRole' | 'accessibilityLabel'
> {
  children: React.ReactNode;
  className?: string;
}

// ─── Heading ──────────────────────────────────────────────────────────────────

export function DisplayHeading({
  children,
  className = '',
  numberOfLines,
  accessibilityRole = 'header',
  accessibilityLabel,
}: TypographyProps): React.JSX.Element {
  return (
    <GluestackHeading
      className={`font-heading text-[40px] leading-[44px] tracking-[-1.6px] text-foreground ${className}`}
      size="4xl"
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GluestackHeading>
  );
}

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
  return (
    <GluestackHeading
      className={`font-heading text-foreground tracking-tight ${className}`}
      size="xl"
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GluestackHeading>
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
  return (
    <GluestackText
      className={`font-body leading-[20px] text-foreground ${className}`}
      size="sm"
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GluestackText>
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
  return (
    <GluestackText
      className={`font-mono text-muted uppercase tracking-[2.2px] ${className}`}
      size="xs"
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GluestackText>
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
  return (
    <GluestackText
      className={`font-mono text-muted tracking-[0.3px] ${className}`}
      size="xs"
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GluestackText>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export function Meta({
  children,
  className = '',
  numberOfLines,
  accessibilityRole = 'text',
  accessibilityLabel,
}: TypographyProps): React.JSX.Element {
  return (
    <GluestackText
      className={`font-mono uppercase text-muted tracking-[2px] ${className}`}
      size="2xs"
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GluestackText>
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
  return (
    <GluestackText
      className={`font-body leading-[20px] text-muted ${className}`}
      size="sm"
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GluestackText>
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
  return (
    <GluestackText
      className={`font-heading text-foreground font-bold leading-none tracking-tight ${className}`}
      size="4xl"
      bold
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </GluestackText>
  );
}
