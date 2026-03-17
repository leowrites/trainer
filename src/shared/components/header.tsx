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

import { useTheme } from '@core/theme/theme-context';
import { Box } from '@shared/ui/box';
import { Text } from '@shared/ui/text';

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
  const { tokens } = useTheme();

  return (
    <Box
      className={`flex-row items-end justify-between pb-6 mb-8 ${className}`}
      style={{ borderBottomWidth: 1, borderBottomColor: tokens.bgBorder }}
      accessibilityRole="header"
    >
      {/* Left — logo / title */}
      <Box>
        <Text
          className="text-[36px] font-bold leading-tight"
          style={{ color: tokens.textPrimary }}
          accessibilityRole="header"
        >
          {title}
          {titleAccent !== undefined && titleAccent !== '' ? (
            <Text style={{ color: tokens.accent }}>{titleAccent}</Text>
          ) : null}
        </Text>
        {subtitle !== undefined && subtitle !== '' ? (
          <Text
            className="text-[11px] mt-0.5"
            style={{ color: tokens.textMuted }}
          >
            {subtitle}
          </Text>
        ) : null}
      </Box>

      {/* Right — meta */}
      {(metaLabel !== undefined && metaLabel !== '') ||
      (metaDetail !== undefined && metaDetail !== '') ? (
        <Box className="items-end">
          {metaLabel !== undefined && metaLabel !== '' ? (
            <Text
              className="text-[13px] font-semibold"
              style={{ color: tokens.secondary }}
            >
              {metaLabel}
            </Text>
          ) : null}
          {metaDetail !== undefined && metaDetail !== '' ? (
            <Text
              className="text-[11px] mt-0.5"
              style={{ color: tokens.textMuted }}
            >
              {metaDetail}
            </Text>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
