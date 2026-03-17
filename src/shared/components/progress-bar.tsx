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
import { View } from 'react-native';

import { Progress, ProgressFilledTrack } from '@shared/ui/progress';
import { Caption } from './typography';

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

function resolveFillClass(variant: ProgressBarVariant): string {
  switch (variant) {
    case 'secondary':
      return 'bg-secondary';
    case 'error':
      return 'bg-error';
    default:
      return 'bg-accent';
  }
}

function resolveSize(height: number): 'xs' | 'sm' | 'md' | 'lg' {
  if (height <= 4) return 'xs';
  if (height <= 8) return 'sm';
  if (height <= 12) return 'md';
  return 'lg';
}

export function ProgressBar({
  progress,
  variant = 'accent',
  height = 8,
  showLabel = false,
  label,
  className = '',
}: ProgressBarProps): React.JSX.Element {
  const clamped = Math.min(1, Math.max(0, progress));
  const percentage = Math.round(clamped * 100);
  const fillClass = resolveFillClass(variant);
  const size = resolveSize(height);

  return (
    <View className={`w-full ${className}`}>
      {label !== undefined && label !== '' ? (
        <View className="flex-row justify-between mb-1">
          <Caption>{label}</Caption>
          {showLabel ? <Caption>{`${percentage}%`}</Caption> : null}
        </View>
      ) : null}

      <Progress
        value={percentage}
        size={size}
        className="w-full bg-surface-elevated"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percentage }}
      >
        <ProgressFilledTrack className={fillClass} />
      </Progress>
    </View>
  );
}
