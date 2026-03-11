/**
 * ProgressBar
 *
 * A horizontal progress indicator that fills from left to right.
 * Mirrors the `.protein-bar-wrap` / `.protein-fill` and `.set-bar-wrap` / `.set-bar`
 * CSS patterns from the design spec.
 *
 * Variants:
 * | variant     | Fill colour             |
 * |-------------|------------------------|
 * | `accent`    | lime `#c8f542` (default) |
 * | `secondary` | amber `#f5a742`         |
 * | `error`     | red `#f05a4f`           |
 *
 * Props:
 * - `progress`    — fill amount as a value between 0 and 1 (inclusive)
 * - `variant`     — colour variant (default `accent`)
 * - `height`      — bar height in dp (default 8)
 * - `showLabel`   — display the percentage text inside/beside the bar
 * - `label`       — text shown above the bar (e.g. `"Protein"`)
 * - `className`   — NativeWind overrides on the outer View
 *
 * Accessibility:
 * - `accessibilityRole="progressbar"`
 * - `accessibilityValue` reports `min`, `max`, and `now` (as a 0–100 value)
 *
 * @example
 * ```tsx
 * <ProgressBar progress={0.72} label="Protein" showLabel />
 * <ProgressBar progress={0.45} variant="error" height={20} />
 * ```
 */

import React from 'react';
import { Text, View } from 'react-native';

import type { ThemeTokens } from '@core/theme';
import { useTheme } from '@core/theme/theme-context';

export type ProgressBarVariant = 'accent' | 'secondary' | 'error';

export interface ProgressBarProps {
  /** A number between 0 and 1 representing the fill fraction. */
  progress: number;
  variant?: ProgressBarVariant;
  /** Bar height in density-independent pixels. Default: 8 */
  height?: number;
  /** If true, renders a `"72%"` label at the right edge of the fill. */
  showLabel?: boolean;
  /** Optional text label rendered above the bar. */
  label?: string;
  className?: string;
}

function resolveFillColour(
  variant: ProgressBarVariant,
  tokens: ThemeTokens,
): string {
  switch (variant) {
    case 'secondary':
      return tokens.secondary;
    case 'error':
      return tokens.error;
    default:
      return tokens.accent;
  }
}

export function ProgressBar({
  progress,
  variant = 'accent',
  height = 8,
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps): React.JSX.Element {
  const { tokens } = useTheme();
  // Clamp progress to [0, 1]
  const clamped = Math.min(1, Math.max(0, progress));
  const percentage = Math.round(clamped * 100);
  const fillColor = resolveFillColour(variant, tokens);

  return (
    <View className={`w-full ${className}`}>
      {label !== undefined && label !== '' ? (
        <View className="flex-row justify-between mb-1">
          <Text className="text-[10px]" style={{ color: tokens.textMuted }}>
            {label}
          </Text>
          {showLabel ? (
            <Text
              className="text-[10px]"
              style={{ color: tokens.textMuted }}
            >{`${percentage}%`}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Track */}
      <View
        className="w-full overflow-hidden"
        style={{ height, backgroundColor: tokens.bgElevated }}
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percentage }}
      >
        {/* Fill */}
        <View
          className="h-full"
          style={{ width: `${percentage}%`, backgroundColor: fillColor }}
          accessible={false}
        />
      </View>
    </View>
  );
}
