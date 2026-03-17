/**
 * Surface
 *
 * A background-surface primitive that maps the design-system's layering tokens
 * (`bgBase` → `bgCard` → `bgElevated`) to a `View` container.
 *
 * Colours respond to the active colour mode via `useTheme()` tokens.
 *
 * | variant     | Background token | Border accent          |
 * |-------------|-----------------|------------------------|
 * | `default`   | `bgBase`         | —                      |
 * | `card`      | `bgCard`         | —                      |
 * | `elevated`  | `bgElevated`     | —                      |
 * | `push`      | `bgElevated`     | `accent` (left, 2px)   |
 * | `pull`      | `bgElevated`     | `secondary` (left, 2px)|
 * | `rest`      | `bgElevated`     | `textMuted` (left, 2px, 50% opacity) |
 *
 * Props:
 * - `variant`   — surface level / semantic role
 * - `children`  — content rendered inside the surface
 * - `className` — additional NativeWind overrides (layout only)
 * - `style`     — escape-hatch inline styles
 *
 * @example
 * ```tsx
 * <Surface variant="card">
 *   <Text>Card content</Text>
 * </Surface>
 * ```
 */

import React from 'react';
import type { ViewProps } from 'react-native';

import { Box } from '@shared/ui/box';

export type SurfaceVariant =
  | 'default'
  | 'card'
  | 'elevated'
  | 'push'
  | 'pull'
  | 'rest';

export interface SurfaceProps extends Pick<ViewProps, 'style'> {
  variant?: SurfaceVariant;
  children?: React.ReactNode;
  className?: string;
}

function resolveVariantClass(variant: SurfaceVariant): string {
  switch (variant) {
    case 'card':
      return 'bg-surface-card';
    case 'elevated':
      return 'bg-surface-elevated';
    case 'push':
      return 'border-l-2 border-accent bg-surface-elevated';
    case 'pull':
      return 'border-l-2 border-secondary bg-surface-elevated';
    case 'rest':
      return 'border-l-2 border-muted bg-surface-elevated opacity-50';
    default:
      return 'bg-surface';
  }
}

export function Surface({
  variant = 'default',
  children,
  className = '',
  style,
}: SurfaceProps): React.JSX.Element {
  return (
    <Box
      className={`${resolveVariantClass(variant)} ${className}`}
      style={style}
      accessibilityRole="none"
    >
      {children}
    </Box>
  );
}
