/**
 * Header
 *
 * App-level header bar with a logo/title on the left and optional metadata
 * on the right.  Mirrors the `<header>` + `.logo` + `.header-meta` pattern
 * from the design spec.
 *
 * Props:
 * - `title`        — main title text (plain)
 * - `titleAccent`  — portion of the title rendered in accent colour
 * - `subtitle`     — small italic tagline below the title
 * - `metaLabel`    — right-side metadata value (rendered in secondary colour)
 * - `metaDetail`   — right-side sub-label below metaLabel
 * - `className`    — additional NativeWind class overrides on the outer View
 *
 * Accessibility: `accessibilityRole="header"` on the root element.
 *
 * @example
 * ```tsx
 * <Header
 *   title="trai"
 *   titleAccent="ner"
 *   metaLabel="Push A"
 *   metaDetail="Day 3 of 4"
 * />
 * ```
 */

import React from 'react';
import { Text, View } from 'react-native';

export interface HeaderProps {
  title: string;
  /** Optional suffix rendered in the accent (`#c8f542`) colour. */
  titleAccent?: string;
  subtitle?: string;
  /** Primary right-side metadata value. */
  metaLabel?: string;
  /** Secondary right-side detail below metaLabel. */
  metaDetail?: string;
  className?: string;
}

export function Header({
  title,
  titleAccent,
  subtitle,
  metaLabel,
  metaDetail,
  className = '',
}: HeaderProps): React.JSX.Element {
  return (
    <View
      className={`flex-row items-end justify-between border-b border-surface-border pb-6 mb-8 ${className}`}
      accessibilityRole="header"
    >
      {/* Left — logo / title */}
      <View>
        <Text
          className="text-[36px] font-bold text-foreground leading-tight"
          accessibilityRole="header"
        >
          {title}
          {titleAccent !== undefined && titleAccent !== '' ? (
            <Text className="text-accent">{titleAccent}</Text>
          ) : null}
        </Text>
        {subtitle !== undefined && subtitle !== '' ? (
          <Text className="text-[11px] text-muted mt-0.5">{subtitle}</Text>
        ) : null}
      </View>

      {/* Right — meta */}
      {(metaLabel !== undefined && metaLabel !== '') ||
      (metaDetail !== undefined && metaDetail !== '') ? (
        <View className="items-end">
          {metaLabel !== undefined && metaLabel !== '' ? (
            <Text className="text-[13px] text-secondary font-semibold">
              {metaLabel}
            </Text>
          ) : null}
          {metaDetail !== undefined && metaDetail !== '' ? (
            <Text className="text-[11px] text-muted mt-0.5">{metaDetail}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
